"""
Measure how accurate the face matching is, for the pitch slide.

Dataset layout (at least 2 photos per person, 10+ people recommended):

    dataset/
      person_01/  a.jpg  b.jpg  c.jpg
      person_02/  a.jpg  b.jpg
      ...

Run (inside the face engine's virtualenv, DeepFace installed):

    python evaluate.py path/to/dataset

It compares every pair of photos:
  * same folder      -> should match      (missed match = below threshold)
  * different folder -> should NOT match  (false match  = above threshold)
and prints both rates for each threshold, plus a suggested threshold.
Nothing is written to the database.
"""
import os
import sys
import itertools
import numpy as np

from face_engine import engine_inst

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".jfif"}


def load_embeddings(root):
    people, skipped, models = {}, [], set()
    for person in sorted(os.listdir(root)):
        folder = os.path.join(root, person)
        if not os.path.isdir(folder):
            continue
        for name in sorted(os.listdir(folder)):
            if os.path.splitext(name)[1].lower() not in IMAGE_EXT:
                continue
            path = os.path.join(folder, name)
            with open(path, "rb") as f:
                img = engine_inst.decode_image(f.read())
            faces = engine_inst.detect_faces(img)
            if not faces:
                skipped.append(path)
                continue
            vec, model = engine_inst.extract_embedding_with_model(img, faces[0])
            models.add(model)
            people.setdefault(person, []).append(np.array(vec, dtype=np.float32))
    return people, skipped, models


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    people, skipped, models = load_embeddings(sys.argv[1])
    if "histogram" in models:
        print("WARNING: DeepFace is not active - results are for the colour-histogram fallback, not a face model.\n")

    genuine, impostor = [], []
    for vecs in people.values():
        for a, b in itertools.combinations(vecs, 2):
            genuine.append(float(np.dot(a, b)))
    names = list(people)
    for i, j in itertools.combinations(range(len(names)), 2):
        for a in people[names[i]]:
            for b in people[names[j]]:
                impostor.append(float(np.dot(a, b)))

    total = sum(len(v) for v in people.values())
    print(f"People: {len(people)}   Photos used: {total}   Skipped (no face found): {len(skipped)}")
    print(f"Same-person pairs: {len(genuine)}   Different-person pairs: {len(impostor)}\n")
    if not genuine or not impostor:
        print("Need at least 2 people with 2+ photos each.")
        sys.exit(1)

    genuine, impostor = np.array(genuine), np.array(impostor)
    print(f"{'Threshold':>9} | {'False match %':>13} | {'Missed match %':>14}")
    print("-" * 44)
    best = None
    for t in np.arange(0.20, 0.96, 0.05):
        fmr = float((impostor >= t).mean() * 100)
        fnmr = float((genuine < t).mean() * 100)
        print(f"{t:9.2f} | {fmr:13.1f} | {fnmr:14.1f}")
        # suggestion: lowest missed-match rate while false matches stay <= 1%
        if fmr <= 1.0 and (best is None or fnmr < best[2]):
            best = (t, fmr, fnmr)

    print()
    if best:
        print(f"Suggested threshold: {best[0]:.2f}  (false match {best[1]:.1f}%, missed match {best[2]:.1f}%)")
    else:
        print("No threshold keeps false matches at or below 1% - collect clearer photos or use a stronger detector.")
    if skipped:
        print("\nPhotos with no face detected:")
        for p in skipped:
            print("  ", p)


if __name__ == "__main__":
    main()
