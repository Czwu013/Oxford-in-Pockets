# Oxford Atlas landmark models

These six landmarks were authored for the earlier Oxford Atlas project using Blender Python. The original modelling scripts construct the meshes. Published photographs informed their proportions. The Radcliffe Camera, Sheldonian Theatre and Hertford Bridge use a procedurally generated oolitic stone texture. The extended tower and museum materials also use CC0 scans. The Christ Church work uses mapped footprints and terrain-derived levels. [Credits and licences](../CREDITS.md)

The original artistic modelling and the corresponding editable and compressed forms are offered under [MIT](../LICENSE). The MIT permission covers the contributors’ own work. OpenStreetMap inputs, public terrain data and CC0 material scans retain the terms stated in the credits.

| Editable file | Model | Authoring record in the original Atlas project |
| --- | --- | --- |
| [radcliffe.blend](radcliffe.blend) | Radcliffe Camera | `architecture.py, radcliffe` |
| [tom.blend](tom.blend) | Tom Tower, earlier tower study | `tom.py, tom` |
| [tom-gate.blend](tom-gate.blend) | Tom Tower, gatehouse used in the map | `tom-gate-lab.py, assembled from tom.py` |
| [christChurch-college.blend](christChurch-college.blend) | Christ Church stonework | `build-college-stone.py, christ_terrace and meadow_elevation` |
| [museum.blend](museum.blend) | Oxford University Museum of Natural History, west front | `museum.py, museum` |
| [sheldonian.blend](sheldonian.blend) | Sheldonian Theatre | `architecture.py, sheldonian` |
| [sighs.blend](sighs.blend) | Hertford Bridge (Bridge of Sighs) | `architecture.py, sighs` |

The runtime uses six geometry bundles in `src/assets/`. `tom.gz` is the later gatehouse from `tom-gate.blend`. `tom.blend` preserves the earlier complete tower study. The Pocket project added baked vertex shading to the gatehouse, Radcliffe Camera and museum west front. Its compressed render meshes are identical to the fourteen-neighbourhood release.

## File identity

The six original editable files in the local fourteen-neighbourhood edition matched the Atlas release byte for byte. In the public copies, workstation and file-picker paths were replaced with relative paths. Texture pixels, geometry and transforms were retained. Original and public file hashes are given below.

| Blender file | Original Atlas SHA-256 | Public copy SHA-256 |
| --- | --- | --- |
| radcliffe.blend | `7950da921de38d1721485c235a2480452a4160b3c2ceab362d7b4cea963a57b8` | `afbf54a9c986e68b672e5390ffd8dd0d7d600f1cc2e48e6c45ebd36b5bb40788` |
| tom.blend | `007067b263381bbbf6628528bed7df82da5a718545a14ba6f8a1d7939eb651bb` | `ec0715a010791801d71ad7f577acab1e8a894fb7ef5a3cff367ef0ff1b485662` |
| tom-gate.blend | `6d03b200824006150ab170c0d9198473c4542646c7a35a8dfbbcb616cfc2d761` | `133f3ec6ee0b7cd840665bd7027caa37a1f8aac2c3fd7878738d98256cbe3d38` |
| christChurch-college.blend | `28fd75e11d79d93e1a120aaa4709f5388947bd6e72b9c22b7133e49619fe38c6` | `625771632ff3bffa50efedbb89658decb0956801ff8f8ce2ff6924021f2be24d` |
| museum.blend | `6f959e5d74c94edaf7257dd080d98585f62d1e5e4c1172869da30f06a55838ea` | `cd561b48f68dedc695bae1dbd3b84970b2e46e197dcef692144765b90848fd14` |
| sheldonian.blend | `ec7899e761e1703c98836c80080591d9b7ced64511b57ac56b5974f0f0c2945b` | `ef96d05467809d6a89a7044136d3fc8ab1c3ff72363dfcd5ae081d457287f19d` |
| sighs.blend | `f1cfaac66c03bfa369fb1c43dc247014438af74f3d79ec10a351290d3dfa4d4e` | `3bed195c025c9bb21e401968f8e5b5d306b97ff13d95a4f4d4b430ac13c10ec5` |

| Runtime file | SHA-256 |
| --- | --- |
| radcliffe.gz | `03e03907614ff22a012125a363cd5f8d6fcf2f9ff621abac9968d7a77253b691` |
| tom.gz | `4c4f5b31b04d6e855bc5433388d80f7a6ed25580f73d8aa65f13107784f86ca6` |
| christChurch-college.gz | `71522e9432c8741fd067ad480974ed588c8612e2d8e003ac0ab35c4f3ecb1199` |
| museum.gz | `cf76e660d743885b78b47c24eb566346a2e054ea28b521ed839f7c4e67d76328` |
| sheldonian.gz | `76c9a010ca2abc3bd2fac88f9c5bd79bb33733c2bfac399fd22c77dae0237cf7` |
| sighs.gz | `41a5fcc71b8127334aa5bf1a002da639ddca649c604837ba5b803f0e6761484e` |
