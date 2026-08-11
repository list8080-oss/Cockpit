import {
  ViewPlugin,
  Decoration,
  type DecorationSet,
  type ViewUpdate,
  EditorView,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { invoke } from "@tauri-apps/api/core";
import type { Locale } from "../../i18n";

// ── Dictionary singleton ──────────────────────────────────────────────────────

type SpellLang = Locale; // en | ru | uk | cs

type NSpell = { correct: (word: string) => boolean };

let spellInstance: NSpell | null = null;
let loadedLang: SpellLang | null = null;
let dictionaryLoading: SpellLang | null = null;
// Bumped on every load request; a load only commits its result if no newer
// request has been issued since — otherwise a slow load for a language the
// user already switched away from could win the race and silently replace
// the dictionary the user is actually seeing.
let dictionaryRequestSeq = 0;
const wordCache = new Map<string, boolean>();

const SKIP_TYPES = new Set([
  "InlineCode",
  "CodeBlock",
  "FencedCode",
  "CodeText",
  "CodeInfo",
  "URL",
  "LinkLabel",
  "Image",
  "WikiLink",
  "HTMLTag",
  "HTMLBlock",
  "HardBreak",
  "ProcessingInstruction",
  "Comment",
]);

const MARK_TYPES = new Set([
  "EmphasisMark",
  "HeaderMark",
  "QuoteMark",
  "ListMark",
  "CodeMark",
  "LinkMark",
  "ImageMark",
]);

async function loadDictionary(lang: SpellLang): Promise<void> {
  if (loadedLang === lang && spellInstance) return;
  if (dictionaryLoading === lang) return;
  dictionaryLoading = lang;
  const myRequest = ++dictionaryRequestSeq;
  try {
    const [{ aff, dic }, nspellModule] = await Promise.all([
      invoke<{ aff: string; dic: string }>("read_dictionary", { lang }),
      import("nspell"),
    ]);
    if (myRequest !== dictionaryRequestSeq) return; // superseded by a newer request
    const NSpell = nspellModule.default as unknown as new (
      aff: string,
      dic: string,
    ) => NSpell;
    spellInstance = new NSpell(aff, dic);
    loadedLang = lang;
    wordCache.clear();
  } catch (err) {
    if (myRequest === dictionaryRequestSeq) {
      console.warn(`Failed to load spell-check dictionary (${lang}):`, err);
      spellInstance = null;
      loadedLang = null;
    }
  } finally {
    if (dictionaryLoading === lang) dictionaryLoading = null;
  }
}

// Letters from any script + apostrophe / soft hyphen / combining acute used in Ukrainian
const WORD_RE = /[\p{L}\p{M}']+/gu;
const MIN_WORD_LEN = 2;
const ALL_CAPS_RE = /^\p{Lu}+$/u;

function isCorrect(word: string): boolean {
  if (!spellInstance) return true;

  if (word.replace(/'/g, "").length < MIN_WORD_LEN) return true;
  if (ALL_CAPS_RE.test(word)) return true;

  const lower = word.toLocaleLowerCase();
  const cached = wordCache.get(lower);
  if (cached !== undefined) return cached;

  const result = spellInstance.correct(word) || spellInstance.correct(lower);
  wordCache.set(lower, result);
  return result;
}

const misspelledDeco = Decoration.mark({ class: "cm-misspelled" });

/**
 * Spell-check ViewPlugin for the given UI locale's Hunspell dictionary.
 */
function createSpellCheckPlugin(lang: SpellLang) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      private checkTimer: ReturnType<typeof setTimeout> | null = null;

      constructor(view: EditorView) {
        this.decorations = Decoration.none;
        if (loadedLang !== lang || !spellInstance) {
          void loadDictionary(lang).then(() => {
            if (loadedLang !== lang) return;
            this.decorations = this.buildDecorations(view);
            view.dispatch();
          });
        } else {
          this.decorations = this.buildDecorations(view);
        }
      }

      update(update: ViewUpdate) {
        if (loadedLang !== lang || !spellInstance) return;

        if (update.docChanged || update.viewportChanged) {
          if (this.checkTimer !== null) clearTimeout(this.checkTimer);
          this.checkTimer = setTimeout(() => {
            this.decorations = this.buildDecorations(update.view);
            update.view.dispatch();
            this.checkTimer = null;
          }, 300);
        }
      }

      destroy() {
        if (this.checkTimer !== null) clearTimeout(this.checkTimer);
      }

      buildDecorations(view: EditorView): DecorationSet {
        if (!spellInstance || loadedLang !== lang) return Decoration.none;

        const builder = new RangeSetBuilder<Decoration>();
        const tree = syntaxTree(view.state);

        for (const { from, to } of view.visibleRanges) {
          const text = view.state.sliceDoc(from, to);
          WORD_RE.lastIndex = 0;

          let match;
          while ((match = WORD_RE.exec(text)) !== null) {
            const word = match[0];

            if (word.replace(/'/g, "").length < MIN_WORD_LEN) continue;

            const wordStart = from + match.index;
            const wordEnd = wordStart + word.length;

            let skip = false;
            tree.iterate({
              from: wordStart,
              to: wordEnd,
              enter(node) {
                if (SKIP_TYPES.has(node.name) || MARK_TYPES.has(node.name)) {
                  skip = true;
                  return false;
                }
              },
            });
            if (skip) continue;

            if (!isCorrect(word)) {
              builder.add(wordStart, wordEnd, misspelledDeco);
            }
          }
        }

        return builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );
}

/** Returns the spell-check extension for the given locale. */
export function spellCheckExtension(lang: SpellLang = "en") {
  return createSpellCheckPlugin(lang);
}
