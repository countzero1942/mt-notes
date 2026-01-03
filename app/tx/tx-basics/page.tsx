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
			<Divider my="md" />
			<MarkdownTxSection
				title="Heading 1 With Tx Bold"
				markdown={`.h1 .b{Bold} Heading`}
			/>
			<MarkdownTxSection
				title="Heading 1 With Tx Italic"
				markdown={`.h1 .i{Italic} Heading`}
			/>
			<MarkdownTxSection
				title="Heading 1 With Tx Bold and Italic"
				markdown={`.h1 .b{Bold} .i{Italic} Heading`}
			/>
			<MarkdownTxSection
				title="Heading 1 With Tx Bold and Italic Recursive"
				markdown={`.h1 .b{Bold .i{Italic}} Heading`}
			/>
			<Divider my="md" />
			<MarkdownTxSection
				title="Heading 1 With Tx-Markdown Bold and Italic"
				markdown={`.h1 **Bold** .i{Italic} Heading`}
			/>
			<MarkdownTxSection
				title="Heading 1 With Tx-Markdown Bold and Italic"
				markdown={`.h1 .b{Bold} *Italic* Heading`}
			/>
			<MarkdownTxSection
				title="Heading 1 With Tx-Markdown Bold and Italic Recursive"
				markdown={`.h1 **Bold .i{Italic}** Heading`}
			/>
			<MarkdownTxSection
				title="Heading 1 With Tx-Markdown Bold and Italic Recursive"
				markdown={`.h1 *Italic .b{Bold}*`}
			/>
			<MarkdownTxSection
				title="Heading 1 With Tx Bold and Italic Recursive"
				markdown={`.h1 .b{Bold *Italic*} Heading`}
			/>
			<MarkdownTxSection
				title="Heading 1 With Tx Bold and Italic Recursive"
				markdown={`.h1 .i{Italic **Bold**} Heading`}
			/>
		</article>
	);
}
