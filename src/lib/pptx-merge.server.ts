// @ts-nocheck — code repris tel quel du Générateur de brochures (vérifié sous sa configuration TypeScript d'origine).
// Server-only PPTX merger. Appends slides from source .pptx buffers into a target .pptx buffer.
// Handles single-slide "flat" sources (image + text boxes) reliably; complex sources
// (charts, custom layouts, themes) may lose formatting since we re-point all slides
// to the target's existing slideLayout1.

import JSZip from "jszip";

function extOf(name: string): string {
  const m = name.match(/\.([^.]+)$/);
  return m ? m[1] : "bin";
}

export async function appendSlidesFromPptx(
  mainBuf: Buffer,
  sourceBufs: Buffer[],
): Promise<Buffer> {
  const main = await JSZip.loadAsync(mainBuf);

  const readStr = async (p: string) => (await main.file(p)!.async("string"));
  let presXml = await readStr("ppt/presentation.xml");
  let presRels = await readStr("ppt/_rels/presentation.xml.rels");
  let contentTypes = await readStr("[Content_Types].xml");

  // Detect the next slide number and next rId
  let nextSlideNum = 1;
  main.forEach((path) => {
    const m = path.match(/^ppt\/slides\/slide(\d+)\.xml$/);
    if (m) nextSlideNum = Math.max(nextSlideNum, parseInt(m[1]) + 1);
  });
  let maxRid = 0;
  for (const m of presRels.matchAll(/Id="rId(\d+)"/g)) {
    maxRid = Math.max(maxRid, parseInt(m[1]));
  }
  let mediaCounter = 0;
  main.forEach((path) => {
    if (/^ppt\/media\//.test(path)) mediaCounter++;
  });

  for (const srcBuf of sourceBufs) {
    const src = await JSZip.loadAsync(srcBuf);
    const srcSlides: string[] = [];
    src.forEach((path) => {
      if (/^ppt\/slides\/slide\d+\.xml$/.test(path)) srcSlides.push(path);
    });
    srcSlides.sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)/)![1]);
      const nb = parseInt(b.match(/slide(\d+)/)![1]);
      return na - nb;
    });

    for (const srcSlidePath of srcSlides) {
      const srcSlideName = srcSlidePath.split("/").pop()!;
      const newSlideName = `slide${nextSlideNum}.xml`;
      let slideXml = await src.file(srcSlidePath)!.async("string");

      // Build new rels (always keep layout ref to target's slideLayout1)
      let newRelsXml =
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>`;

      const srcRelsFile = src.file(`ppt/slides/_rels/${srcSlideName}.rels`);
      let localRid = 2;
      if (srcRelsFile) {
        const srcRelsXml = await srcRelsFile.async("string");
        for (const rm of srcRelsXml.matchAll(/<Relationship\s+([^>]+?)\s*\/>/g)) {
          const attrs = rm[1];
          const idM = attrs.match(/Id="([^"]+)"/);
          const typeM = attrs.match(/Type="([^"]+)"/);
          const targetM = attrs.match(/Target="([^"]+)"/);
          if (!idM || !typeM || !targetM) continue;
          const oldId = idM[1];
          const type = typeM[1];
          let target = targetM[1];

          if (type.endsWith("/slideLayout")) continue; // already added
          if (type.endsWith("/image")) {
            const mediaName = target.replace(/^\.\.\/media\//, "");
            const srcMedia = src.file(`ppt/media/${mediaName}`);
            if (!srcMedia) continue;
            mediaCounter++;
            const newMediaName = `image_fixed_${mediaCounter}.${extOf(mediaName)}`;
            main.file(`ppt/media/${newMediaName}`, await srcMedia.async("uint8array"));
            target = `../media/${newMediaName}`;

            // Register media content type if unknown
            const ext = extOf(mediaName).toLowerCase();
            if (!contentTypes.includes(`Extension="${ext}"`)) {
              const mime =
                ext === "png"
                  ? "image/png"
                  : ext === "jpg" || ext === "jpeg"
                  ? "image/jpeg"
                  : ext === "gif"
                  ? "image/gif"
                  : ext === "svg"
                  ? "image/svg+xml"
                  : "application/octet-stream";
              contentTypes = contentTypes.replace(
                /<Types([^>]*)>/,
                `<Types$1><Default Extension="${ext}" ContentType="${mime}"/>`,
              );
            }
          } else {
            // skip unsupported (theme/chart/hyperlink/etc.)
            continue;
          }

          // IMPORTANT: use a namespace that cannot collide with the source's own rIds
          // (avoids "rId8 → rId2" then later "rId2 → rId5" cascade that duplicated images).
          const newRid = `rIdFxd${localRid++}`;
          // Replace r:embed / r:link references to this rel in the slide xml
          const escOld = oldId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          slideXml = slideXml
            .replace(new RegExp(`r:embed="${escOld}"`, "g"), `r:embed="${newRid}"`)
            .replace(new RegExp(`r:link="${escOld}"`, "g"), `r:link="${newRid}"`);
          newRelsXml += `<Relationship Id="${newRid}" Type="${type}" Target="${target}"/>`;
        }
      }
      newRelsXml += `</Relationships>`;

      main.file(`ppt/slides/${newSlideName}`, slideXml);
      main.file(`ppt/slides/_rels/${newSlideName}.rels`, newRelsXml);

      // Content_Types
      contentTypes = contentTypes.replace(
        "</Types>",
        `<Override PartName="/ppt/slides/${newSlideName}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`,
      );

      // presentation rels
      maxRid++;
      const presRid = `rId${maxRid}`;
      presRels = presRels.replace(
        "</Relationships>",
        `<Relationship Id="${presRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/${newSlideName}"/></Relationships>`,
      );

      // presentation sldIdLst
      const existingIds: number[] = [];
      for (const m of presXml.matchAll(/<p:sldId\s+id="(\d+)"/g)) existingIds.push(parseInt(m[1]));
      const newSlideId = Math.max(256, ...existingIds) + 1;
      presXml = presXml.replace(
        "</p:sldIdLst>",
        `<p:sldId id="${newSlideId}" r:id="${presRid}"/></p:sldIdLst>`,
      );

      nextSlideNum++;
    }
  }

  main.file("[Content_Types].xml", contentTypes);
  main.file("ppt/_rels/presentation.xml.rels", presRels);
  main.file("ppt/presentation.xml", presXml);

  const out = (await main.generateAsync({ type: "nodebuffer" })) as Buffer;
  return out;
}

function base64ToBuffer(dataUrl: string): Buffer {
  const b64 = dataUrl.includes(",") ? dataUrl.split(",", 2)[1] : dataUrl;
  return Buffer.from(b64, "base64");
}

/** Detect a pptx BrochureMedia by MIME or filename. */
export function isPptxMedia(media: { dataUrl?: string; name?: string } | null | undefined): boolean {
  if (!media?.dataUrl) return false;
  if (/presentationml|officedocument/.test(media.dataUrl.slice(0, 200))) return true;
  if (media.name && /\.pptx?$/i.test(media.name)) return true;
  return false;
}

export function mediaToPptxBuffer(media: { dataUrl: string }): Buffer {
  return base64ToBuffer(media.dataUrl);
}
