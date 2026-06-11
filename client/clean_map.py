from html.parser import HTMLParser

class CleanFinder(HTMLParser):
    def __init__(self):
        super().__init__()
        self.path = []
        self.blocks = {}
        self.current_block = None
        

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        self.path.append((tag, attrs_dict))
        
        id_name = attrs_dict.get("id", "")
        if id_name.startswith("rec"):
            self.current_block = id_name
            self.blocks[id_name] = []

    def handle_endtag(self, tag):
        if self.path:
            self.path.pop()

    def handle_data(self, data):
        cleaned = data.strip()
        if cleaned and self.current_block:
            # Skip style and script tags
            if self.path and self.path[-1][0] in ["style", "script"]:
                return

            # Find closest parent with data-elem-id
            elem_id = None
            for parent_tag, parent_attrs in reversed(self.path):
                if "data-elem-id" in parent_attrs:
                    elem_id = parent_attrs["data-elem-id"]
                    break
            
            self.blocks[self.current_block].append({
                "elem_id": elem_id,
                "tag": self.path[-1][0] if self.path else None,
                "text": cleaned
            })

with open("raw_tilda.html", "r", encoding="utf-8") as f:
    html = f.read()

parser = CleanFinder()
parser.feed(html)
parser.close()

with open("clean_all_texts.txt", "w", encoding="utf-8") as out:
    for block_id, items in parser.blocks.items():
        out.write(f"\n================ Block: {block_id} ================\n")
        grouped = {}
        for item in items:
            eid = item["elem_id"] or "no-elem-id"
            if eid not in grouped:
                grouped[eid] = []
            grouped[eid].append(f"<{item['tag']}>: {item['text']}")
        
        for eid, texts in grouped.items():
            out.write(f"  Element ID: {eid}\n")
            for t in texts:
                out.write(f"    {t}\n")

print("Clean text map written to clean_all_texts.txt")
