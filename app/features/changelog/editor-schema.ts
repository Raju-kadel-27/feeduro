import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { ImageBlock } from "@features/changelog/components/image-block";
import { VideoBlock } from "@features/changelog/components/video-block";
import { YouTubeBlock } from "@features/changelog/components/youtube-block";

// Replace built-in image/video with our URL-input custom blocks.
// Type names ("image", "video") are preserved so existing saved content loads correctly.
const { image: _bi, video: _bv, ...restBlockSpecs } = defaultBlockSpecs;

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...restBlockSpecs,
    image: ImageBlock(),
    video: VideoBlock(),
    youtube: YouTubeBlock(),
  },
});

export type EditorSchema = typeof schema;
