import { File as FileIcon, Folder as FolderIcon, Star } from "@phosphor-icons/react";

type TreeNode = {
	name: string;
	path: string;
	isFile: boolean;
	children: TreeNode[];
};

function sortNodes(nodes: TreeNode[]): void {
	nodes.sort((a, b) => (a.isFile === b.isFile ? a.name.localeCompare(b.name) : a.isFile ? 1 : -1));
	for (const n of nodes) sortNodes(n.children);
}

function buildTree(paths: string[]): TreeNode[] {
	const root: TreeNode[] = [];
	for (const path of paths) {
		const segs = path.split("/");
		let level = root;
		let acc = "";
		segs.forEach((seg, i) => {
			acc = acc ? `${acc}/${seg}` : seg;
			const isFile = i === segs.length - 1;
			let node = level.find((n) => n.name === seg && n.isFile === isFile);
			if (!node) {
				node = { name: seg, path: acc, isFile, children: [] };
				level.push(node);
			}
			level = node.children;
		});
	}
	sortNodes(root);
	return root;
}

export function FileTree({
	paths,
	activePath,
	entryPath,
	onSelect,
}: {
	paths: string[];
	activePath?: string;
	entryPath?: string;
	onSelect: (path: string) => void;
}) {
	const tree = buildTree(paths);
	return (
		<ul className="text-sm">
			{tree.map((node) => (
				<TreeRow
					key={node.path}
					node={node}
					depth={0}
					activePath={activePath}
					entryPath={entryPath}
					onSelect={onSelect}
				/>
			))}
		</ul>
	);
}

function TreeRow({
	node,
	depth,
	activePath,
	entryPath,
	onSelect,
}: {
	node: TreeNode;
	depth: number;
	activePath?: string;
	entryPath?: string;
	onSelect: (path: string) => void;
}) {
	const pad = { paddingLeft: `${depth * 12 + 8}px` };

	if (!node.isFile) {
		return (
			<li>
				<div style={pad} className="flex items-center gap-1.5 py-1 pr-2 text-muted-foreground">
					<FolderIcon className="size-3.5 shrink-0" />
					<span className="truncate">{node.name}</span>
				</div>
				<ul>
					{node.children.map((child) => (
						<TreeRow
							key={child.path}
							node={child}
							depth={depth + 1}
							activePath={activePath}
							entryPath={entryPath}
							onSelect={onSelect}
						/>
					))}
				</ul>
			</li>
		);
	}

	const active = node.path === activePath;
	return (
		<li>
			<button
				type="button"
				style={pad}
				onClick={() => onSelect(node.path)}
				className={`flex w-full items-center gap-1.5 py-1 pr-2 text-left hover:bg-accent ${
					active ? "bg-accent font-medium" : ""
				}`}
			>
				<FileIcon className="size-3.5 shrink-0" />
				<span className="truncate">{node.name}</span>
				{node.path === entryPath && (
					<Star weight="fill" className="ml-auto size-3 shrink-0 text-amber-500" />
				)}
			</button>
		</li>
	);
}
