> ⚠️ This skill is for NOVEL export. For RemNote analysis EPUB, use `remnote-epub` skill instead.

# EPUB Generator — Premium Novel Export

Tạo file EPUB3 Premium từ chapters markdown, sẵn sàng phát hành.

## Triggers
- epub, ebook, xuất sách, export book, publish, phát hành, tạo epub, build epub, format sách

## Description
Skill tạo EPUB3 Premium hoàn chỉnh từ markdown chapters. Bao gồm:
- Cover image (bìa trước/sau/gáy)
- Front matter (title page, copyright, dedication, author's note, TOC)
- Body (chapters organized by arc)
- Back matter (epilogue, character guide, glossary, timeline, acknowledgments, about author)
- QR code embed
- Custom CSS styling
- Metadata (author, language, publisher, date)

## Dependencies
- `pandoc` (system, for markdown→XHTML conversion)
- `nodepub` (npm, for EPUB3 generation)
- `qrencode` (system, for QR code)

## Usage

### Quick build:
```bash
node scripts/epub-builder.mjs build \
  --title "Trọng Sinh Thành Đường Tam Tạng" \
  --author "Tiểu Tâm" \
  --chapters ./chapters/ \
  --cover ./cover.jpg \
  --output ./output.epub
```

### Full premium build:
```bash
node scripts/epub-builder.mjs premium \
  --title "Trọng Sinh Thành Đường Tam Tạng" \
  --author "Tiểu Tâm" \
  --chapters ./chapters/ \
  --cover ./cover.jpg \
  --qr-url "https://www.facebook.com/profile.php?id=61588560594683" \
  --dedication "Dành tặng..." \
  --author-note "Lời tác giả..." \
  --arcs 4 \
  --output ./output.epub
```

### Options:
- `--title` — Tên sách
- `--author` — Tên tác giả
- `--chapters` — Thư mục chứa chapters (ch01.md, ch02.md...)
- `--cover` — Hình bìa trước (jpg/png)
- `--output` — File EPUB output
- `--qr-url` — URL cho QR code (in ở cuối sách)
- `--dedication` — Lời đề tặng
- `--author-note` — Lời tác giả
- `--arcs` — Số arc (chia phần)
- `--language` — Ngôn ngữ (default: vi)
- `--css` — Custom CSS file

## EPUB Premium Structure
```
📖 EPUB
├── cover.jpg (bìa trước)
├── title-page.xhtml
├── copyright.xhtml
├── dedication.xhtml
├── author-note.xhtml
├── toc.xhtml (mục lục)
├── part1.xhtml → part4.xhtml (trang chia phần)
├── ch01.xhtml → ch80.xhtml
├── epilogue.xhtml
├── character-guide.xhtml
├── glossary.xhtml
├── timeline.xhtml
├── acknowledgments.xhtml
├── about-author.xhtml (+ QR code)
├── style.css
└── META-INF/container.xml
```

## Integration
- Kết hợp với `novel-guardian` (Bible → character guide, timeline)
- Kết hợp với `book-cover-design` (generate cover)
- Kết hợp với `qr-code-generator` (QR code)
- Kết hợp với `humanize` (final clean trước export)

## Notes
- EPUB3 format (hỗ trợ CSS3, SVG inline)
- Responsive: đọc tốt trên Kindle, Kobo, Apple Books, Google Play Books
- Font: Serif cho body, Sans-serif cho heading
- Line height: 1.7 (thoải mái đọc tiếng Việt)
