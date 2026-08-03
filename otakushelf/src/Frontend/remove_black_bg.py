from PIL import Image
import numpy as np
import os


def remove_black_bg(input_path, output_path, threshold=60, feather=True):
    """
    Removes black/near-black background, makes it transparent.
    threshold : max RGB value counted as 'black' (0-255)
    feather   : smooth alpha falloff near edges (looks cleaner, avoids jagged cutoff)
    """
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img).astype(np.int16)

    brightness = arr[:, :, :3].max(axis=2)

    if feather:
        # smooth transition: fully transparent below threshold,
        # fully opaque above threshold+40, linear ramp in between
        fade_range = 40
        alpha = np.clip((brightness - threshold) / fade_range, 0, 1) * 255
    else:
        alpha = np.where(brightness <= threshold, 0, 255)

    # keep existing transparency (badges already have transparent corners)
    existing_alpha = arr[:, :, 3]
    combined = np.minimum(existing_alpha, alpha.astype(np.int16))
    arr[:, :, 3] = combined.astype(np.uint8)

    Image.fromarray(arr.astype(np.uint8), "RGBA").save(output_path, "WEBP", lossless=True)


def batch_process(in_folder, out_folder, threshold=60, feather=True):
    os.makedirs(out_folder, exist_ok=True)
    files = [f for f in os.listdir(in_folder) if f.lower().endswith(".webp")]

    for i, fname in enumerate(files, 1):
        remove_black_bg(
            os.path.join(in_folder, fname),
            os.path.join(out_folder, os.path.splitext(fname)[0] + ".webp"),
            threshold, feather
        )
        print(f"[{i}/{len(files)}] done: {fname}")


# Usage
batch_process(
    r"D:\OtakuShelf\otakushelf\src\Frontend\images\CommonBadges",
    r"D:\OtakuShelf\otakushelf\src\Frontend\images\CommonBadges",
    threshold=60, feather=True
)
