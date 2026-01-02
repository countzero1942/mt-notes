import { MarkdownTxSection } from "@/ui/markdowntx-section";

export default function TxBasicsPage() {
	const tx1 = `.h1 Heading 1`;
	return (
		<article>
			<h1>Tx Basics</h1>
			<p>In this page I will explore tx basics.</p>
			<MarkdownTxSection title="Heading 1" markdown={tx1} />
		</article>
	);
}
