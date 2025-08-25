#!/usr/bin/env python3
"""Generate a spherical mesh and write it in SMF (Simple Model Format).

Usage:
    python generate_sphere_smf.py --radius 1.0 --stacks 16 --slices 32 --out sphere.smf

Output format follows the SMF core operators: lines beginning with `v` (vertex)
and `f` (triangle face). Vertex indices in faces are 1-based, per the SMF spec.
"""
import math
import argparse

def generate_sphere_with_uv(radius, stacks, slices):
    vertices = []
    uvs = []
    for i in range(stacks + 1):
        theta = math.pi * i / stacks
        sin_theta = math.sin(theta)
        cos_theta = math.cos(theta)
        for j in range(slices + 1):
            phi = 2.0 * math.pi * j / slices
            x = radius * sin_theta * math.cos(phi)
            y = radius * cos_theta
            z = radius * sin_theta * math.sin(phi)
            vertices.append((x, y, z))
            u = j / slices
            v = 1.0 - (i / stacks)
            uvs.append((u, v))

    faces = []
    verts_per_row = slices + 1
    for i in range(stacks):
        for j in range(slices):
            k1 = i * verts_per_row + j
            k2 = (i + 1) * verts_per_row + j
            v1 = k1 + 1
            v2 = k1 + 2
            v3 = k2 + 1
            v4 = k2 + 2

            if i != 0:
                faces.append((v1, v3, v2))
            if i != (stacks - 1):
                faces.append((v2, v3, v4))

    return vertices, uvs, faces

def write_smf_with_uv(filename, vertices, uvs, faces, comment=None):
    with open(filename, 'w', encoding='utf-8') as f:
        if comment:
            for line in comment.splitlines():
                f.write(f"# {line}\n")
        for v in vertices:
            f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
        for uv in uvs:
            f.write(f"vt {uv[0]:.6f} {uv[1]:.6f}\n")
        for face in faces:
            f.write(f"f {face[0]} {face[1]} {face[2]}\n")

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Generate sphere with UVs in SMF format')
    parser.add_argument('--radius', type=float, default=1.0)
    parser.add_argument('--stacks', type=int, default=16)
    parser.add_argument('--slices', type=int, default=32)
    parser.add_argument('--out', '-o', default='sphere_uv.smf')
    args = parser.parse_args()

    verts, uvs, faces = generate_sphere_with_uv(args.radius, args.stacks, args.slices)
    comment = f"Generated sphere with UVs: radius={args.radius}, stacks={args.stacks}, slices={args.slices}"
    write_smf_with_uv(args.out, verts, uvs, faces, comment=comment)
    print(f"Wrote {len(verts)} vertices, {len(uvs)} UVs, and {len(faces)} faces to '{args.out}'")
