# Placeholder props

Each file here is the **procedural fallback** for one region: low-poly
stand-ins built from three.js primitives. The regions now import from
`../models/<region>` instead, which renders the real models and re-exports the
custom story pieces from here. Point a region's import back at
`./placeholders/<region>` to fall back.

To swap in real models, create a module with the **same exported names and
props** that renders the `.glb` instead (load it with drei's `useGLTF(path, DRACO_PATH)`
from `lib/assets.ts`), then change that one import in the region file.

Props that take `items` are instanced (one draw call for all copies); a
replacement should keep that by using the model's geometry and material in an
`instancedMesh`, or `Scatter` from `components/world/Scatter.tsx`.
