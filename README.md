# n8n-nodes-pdf-writer

A custom n8n community node with two operations:
- **Write Text** – write text at specific **X/Y coordinates** on any PDF page
- **Merge PDFs** – merge specific pages from multiple PDF files into one

This node was designed to fill a necessary gap,
and we've decided to make it available for anyone who needs this functionality in n8n.

---

## Features

- ✅ Write text at precise X/Y coordinates on any page
- ✅ Label each text entry for easy identification
- ✅ Multiple text entries per execution
- ✅ Target a specific page or **all pages** at once
- ✅ Y-origin toggle: measure from **top** or **bottom** of the page
- ✅ Choose from 7 built-in fonts (Helvetica, Times, Courier families)
- ✅ Set font size, color (hex), rotation, and opacity
- ✅ Merge multiple PDFs into one — all pages or **select specific pages per file**
- ✅ Page selection supports ranges and lists (e.g. `1,3,5-8`)
- ✅ Works with binary PDF data from any n8n node

---

## Installation

In the n8n UI: **Settings → Community Nodes → Install** → enter `n8n-nodes-pdf-writer`

Then restart n8n.

---

## Operations

### Write Text

Writes one or more text entries at specified X/Y positions on a PDF.

| Parameter | Description |
|---|---|
| **Input PDF Field** | Binary field name holding the source PDF (default: `data`) |
| **Output Field Name** | Binary field name to write the result to (default: `data`) |

#### Text Entry fields

| Field | Description |
|---|---|
| **Label** | A name to identify this entry (e.g. "Header", "Footer", "Stamp") |
| **Text** | The text string to draw |
| **Page** | Page number (1-based). Set to `0` to apply to all pages |
| **X Position** | Points from the left edge |
| **Y Position** | Points from the selected Y origin |
| **Y Origin** | `From Bottom` (PDF default) or `From Top` (more intuitive) |
| **Font Size** | Size in points |
| **Font** | Helvetica, Helvetica Bold, Times Roman, Courier, etc. |
| **Color (Hex)** | Text color, e.g. `#FF0000` for red |
| **Rotation** | Degrees counter-clockwise |
| **Opacity** | 0.0 (invisible) → 1.0 (solid) |

---

### Merge PDFs

Takes **all input items** (each carrying a PDF binary) and merges them into a single PDF. You can include all pages or select specific pages from each file.

| Parameter | Description |
|---|---|
| **Binary Field** | Binary field name that holds the PDF in each input item (default: `data`) |
| **Pages Per Item** | `All Pages` or `Select Pages Per Item` |
| **Pages** | Page selection per item — supports `all`, single pages (`1,3,5`), and ranges (`2-4`). Pages are 1-based. Supports n8n expressions. |
| **Output Field Name** | Binary field name for the merged PDF output (default: `data`) |
| **Output File Name** | File name of the merged PDF (default: `merged.pdf`) |

#### Page selection format

| Input | Meaning |
|---|---|
| `all` | All pages from this PDF |
| `1,3,5` | Pages 1, 3 and 5 only |
| `2-6` | Pages 2 through 6 |
| `1,3,5-8` | Pages 1, 3 and 5 through 8 |

You can use n8n expressions in the Pages field to select different pages from each item dynamically:
```
{{ $itemIndex === 0 ? "1-3" : $itemIndex === 1 ? "2,5" : "all" }}
```

---

## Coordinate System (Write Text)

PDF coordinates by default start at the **bottom-left corner** (0, 0). A standard A4 page is 595 × 842 points.

```
(0, 842) ─────────────── (595, 842)   ← Top
   │                          │
   │     Y increases ↑        │
   │                          │
(0, 0) ──────────────── (595, 0)      ← Bottom (PDF origin)
```

When **Y Origin = "From Top"** is selected, the node automatically converts for you:  
`y_pdf = page_height − y_from_top`

**Tip:** A4 = 595 × 842 pt | Letter = 612 × 792 pt | 1 inch = 72 points

---

## Example Workflows

### Write Text

```
[Read Binary File] → [PDF Text Writer (Write Text)] → [Write Binary File]
```

1. Use **Read Binary File** (or HTTP Request, etc.) to get a PDF into a binary field
2. Add a **PDF Text Writer** node, set Operation to **Write Text**
3. Add text entries with label, content, position and style
4. The output binary field contains the modified PDF

#### Sample text entry configuration
```json
{
  "label": "Confidential Stamp",
  "text": "CONFIDENTIAL",
  "page": 1,
  "x": 200,
  "y": 50,
  "yOrigin": "top",
  "fontSize": 24,
  "font": "Helvetica-Bold",
  "color": "#FF0000",
  "rotation": 0,
  "opacity": 0.8
}
```

### Merge PDFs

```
[Item 1: PDF A] ─┐
[Item 2: PDF B] ─┼─→ [PDF Text Writer (Merge PDFs)] → [Write Binary File]
[Item 3: PDF C] ─┘
```

1. Feed multiple items, each with a PDF binary field
2. Add a **PDF Text Writer** node, set Operation to **Merge PDFs**
3. Set **Pages Per Item** to `Select Pages Per Item` and configure a Pages expression
4. The single output item contains the merged PDF

---

## Dependencies

- [`pdf-lib`](https://pdf-lib.js.org/) – Pure JavaScript PDF manipulation

---

## License

MIT
