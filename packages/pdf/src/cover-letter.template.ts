/**
 * Engineeringresumes-family letter: A4, XCharter, name + `|` contact line.
 * Fonts come from rendercv-fonts via TYPST_FONT_PATHS (see resolveTypstFontEnv).
 * `{{bindings}}` is replaced with `#let` assignments before compile.
 */
export const COVER_LETTER_TYPST_TEMPLATE = `{{bindings}}

#set document(title: name)
#set text(lang: "en", font: "XCharter", size: 10pt, fill: rgb(0, 0, 0))
#set page(paper: "a4")
#set page(margin: 0.7in)
#set par(justify: true, leading: 0.65em)

#align(center)[
  #text(size: 25pt)[#name]
  #if has-contact {
    v(0.35cm)
    text(size: 10pt)[#contact-line]
  }
]

#v(0.55cm)

#date-line

#if company != "" [
  #v(0.45cm)
  #company
]
#if role != "" [
  #par[Re: #role]
]

#v(0.55cm)

#for p in paragraphs {
  par[#p]
  v(0.42cm)
}
`;
