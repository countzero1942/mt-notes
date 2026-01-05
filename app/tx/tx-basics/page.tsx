import { Divider } from "@mantine/core";
import { MarkdownTxSection } from "@/ui/markdowntx-section";

export default function TxBasicsPage() {
	return (
		<article>
			<h1>Tx Basics</h1>
			<p>In this page I will explore tx basics.</p>
			<MarkdownTxSection title="Heading 1" markdown={`.h1 Heading 1`} />
			<MarkdownTxSection title="Heading 2" markdown={`.h2 Heading 2`} />
			<MarkdownTxSection title="Heading 3" markdown={`.h3 Heading 3`} />
			<MarkdownTxSection title="Heading 4" markdown={`.h4 Heading 4`} />
			<MarkdownTxSection title="Heading 5" markdown={`.h5 Heading 5`} />
			<MarkdownTxSection title="Heading 6" markdown={`.h6 Heading 6`} />
			<MarkdownTxSection title="Heading 7" markdown={`.h7 Heading 7`} />
			<MarkdownTxSection title="Heading 0" markdown={`.h0 Heading 0`} />
			<Divider my="md" />
			<MarkdownTxSection
				title="Text With Tx Bold"
				markdown={`A .b{Bold} Text`}
			/>
			<MarkdownTxSection title="Text With Tx Bold" markdown={`.b{Bold} Text`} />
			<MarkdownTxSection title="Text With Tx Bold" markdown={`Very .b{Bold}`} />
			<MarkdownTxSection
				title="Text With Tx Bold"
				markdown={`Very .b{Bold}.`}
			/>
			<MarkdownTxSection
				title="Text With Tx Bold"
				markdown={`Very .b{Bold}!`}
			/>
			<MarkdownTxSection
				title="Text With Tx Bold and Italic Word"
				markdown={`A .b{Bold}.i{Italic}Word text`}
			/>

			<Divider my="md" />
			<MarkdownTxSection
				title="Heading 3 With Tx Bold"
				markdown={`.h3 A .b{Bold} Heading`}
			/>
			<MarkdownTxSection
				title="Heading 3 With Tx Bold"
				markdown={`.h3 .b{A Bold} Heading`}
			/>
			<MarkdownTxSection
				title="Heading 3 With Tx Italic"
				markdown={`.h3 An .i{Italic} Heading`}
			/>
			<MarkdownTxSection
				title="Heading 3 With Tx Bold and Italic"
				markdown={`.h3 A .b{Bold} .i{Italic} Heading`}
			/>
			<MarkdownTxSection
				title="Heading 3 With Tx Bold and Italic Recursive"
				markdown={`.h3 .b{Bold .i{Italic}} Heading`}
			/>
			<MarkdownTxSection
				title="Heading 3 With Tx Many Nested Recursive"
				markdown={`.h3 .b{Bold .i{Italic .u{Underline}}} Heading`}
			/>
			<MarkdownTxSection
				title="Heading 3 With Tx Many Nested Recursive"
				markdown={`.h3 .q{Quoted .b{Bold .i{Italic .u{Underline}}}} Heading`}
			/>

			<Divider my="md" />
			<MarkdownTxSection
				title="Heading 3 With Tx-Markdown Bold and Italic"
				markdown={`.h3 **Bold** .i{Italic} Heading`}
			/>
			<MarkdownTxSection
				title="Heading 3 With Tx-Markdown Bold and Italic"
				markdown={`.h3 .b{Bold} *Italic* Heading`}
			/>
			<MarkdownTxSection
				title="Heading 3 With Tx-Markdown Mixed Bold, Italic Recursive"
				markdown={`.h3 .b{Bold *Italic*} Heading`}
			/>
			<MarkdownTxSection
				title="Heading 3 With Tx Bold and Italic Recursive"
				markdown={`.h3 .i{Italic **Bold**} Heading`}
			/>
			<MarkdownTxSection
				title="Heading 3 With Tx-Markdown Mixed Bold, Italic Recursive"
				markdown={`.h3 **Bold .i{Italic}** Heading`}
			/>
			<MarkdownTxSection
				title="Heading 3 With Tx-Markdown Mixed Italic, Bold Recursive"
				markdown={`.h3 *Italic .b{Bold} Heading*`}
			/>
			<MarkdownTxSection
				title="Heading 3 With Tx-Markdown Mixed Italic, Bold Recursive"
				markdown={`.h3 *Italic .b{Bold}*`}
			/>
			<MarkdownTxSection
				title="Heading 3 With Tx-Markdown Mixed Italic, Bold Recursive"
				markdown={`.h3 *Italic .b{Bold}* Heading`}
			/>
			<Divider my="md" />
			<MarkdownTxSection title="Latex" markdown={`$r>g$`} />
			<MarkdownTxSection title="Latex in Text" markdown={`This is $r>g$`} />
			<MarkdownTxSection
				title="Tx Italic and Latex"
				markdown={`This is .i{Italic} and some math: $r>g$`}
			/>
			<MarkdownTxSection
				title="Heading 1 With Tx Italic and Latex"
				markdown={`.h3 .i{Italic} Heading $r>g$`}
			/>
		</article>
	);
}
