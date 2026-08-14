import { describe, expect, it } from "vitest";
import { SelectionLogic } from "../src/core/SelectionLogic";

describe("Non-Markdown embed regressions", () => {
    it("does not read binary embeds and still locates text after them", async () => {
        const embedToken = "![[photo.png]]";
        const source = `Before image.\n\n${embedToken}\n\nAfter image target.`;
        const file = { path: "note.md", extension: "md" };
        const imageFile = { path: "photo.png", extension: "png" };
        const embedStart = source.indexOf(embedToken);
        const readFiles = [];
        const app = {
            vault: {
                read: async (target) => {
                    readFiles.push(target.path);
                    if (target === imageFile) {
                        throw new Error("binary attachment must not be read as Markdown");
                    }
                    return source;
                },
            },
            metadataCache: {
                getFileCache: (target) =>
                    target === file
                        ? {
                              embeds: [
                                  {
                                      link: "photo.png",
                                      position: {
                                          start: { offset: embedStart },
                                          end: { offset: embedStart + embedToken.length },
                                      },
                                  },
                              ],
                          }
                        : { embeds: [] },
                getFirstLinkpathDest: (link) => (link === "photo.png" ? imageFile : null),
            },
        };
        const logic = new SelectionLogic(app);
        const result = await logic.locateSelection(file, { file }, "After image target.", null, 0);
        const expectedStart = source.indexOf("After image target.");

        expect(readFiles).toEqual(["note.md"]);
        expect(result).not.toBeNull();
        expect(result.file).toBe(file);
        expect(result.start).toBe(expectedStart);
        expect(result.end).toBe(expectedStart + "After image target.".length);
    });

    it("continues to expand Markdown embeds", async () => {
        const embedToken = "![[child.md]]";
        const source = `Before child.\n\n${embedToken}\n\nAfter child.`;
        const childSource = "Child target text.";
        const file = { path: "note.md", extension: "md" };
        const childFile = { path: "child.md", extension: "md" };
        const embedStart = source.indexOf(embedToken);
        const app = {
            vault: {
                read: async (target) => (target === childFile ? childSource : source),
            },
            metadataCache: {
                getFileCache: (target) =>
                    target === file
                        ? {
                              embeds: [
                                  {
                                      link: "child.md",
                                      position: {
                                          start: { offset: embedStart },
                                          end: { offset: embedStart + embedToken.length },
                                      },
                                  },
                              ],
                          }
                        : { embeds: [] },
                getFirstLinkpathDest: (link) => (link === "child.md" ? childFile : null),
            },
        };
        const logic = new SelectionLogic(app);
        const result = await logic.locateSelection(file, { file }, "Child target text.", null, 0);

        expect(result).not.toBeNull();
        expect(result.file).toBe(childFile);
        expect(result.start).toBe(0);
        expect(result.end).toBe(childSource.length);
    });
});
