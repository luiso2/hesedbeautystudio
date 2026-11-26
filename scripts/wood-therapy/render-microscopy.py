"""Blender -b -P render-microscopy.py -- OUTPUT_DIRECTORY [FRAME ...].
Frames 0–83 show lymph uptake; 84–167 show erythrocytes. 24 fps.
Orthographic cutaway, false colours and enlarged fluid tracers for readability.
The inlet is a free endothelial edge hinged into the lumen (Baluk et al., 2007).
"""
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
output = Path(args[0])
output.mkdir(parents=True, exist_ok=True)
frames = list(map(int, args[1:])) or range(168)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 14
scene.cycles.use_denoising = True
scene.cycles.use_adaptive_sampling = True
scene.cycles.max_bounces = 4
scene.render.use_persistent_data = True
prefs = bpy.context.preferences.addons["cycles"].preferences
if sys.platform == "darwin":
    prefs.compute_device_type = "METAL"
    prefs.refresh_devices()
    if any(d.type == "METAL" for d in prefs.devices):
        for d in prefs.devices:
            d.use = d.type == "METAL"
        scene.cycles.device = "GPU"
scene.render.resolution_x = scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "JPEG"
scene.render.image_settings.quality = 94
scene.world = bpy.data.worlds.new("Microscope fill")
scene.world.color = (.23, .20, .17)
scene.view_settings.view_transform = "AgX"

def material(name, low, high, rough=.38, subsurface=.06):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*high, 1)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bs = nodes.get("Principled BSDF")
    bs.inputs["Roughness"].default_value = rough
    bs.inputs["Subsurface Weight"].default_value = subsurface
    bs.inputs["Subsurface Scale"].default_value = .06
    bs.inputs["Coat Weight"].default_value = .19
    tex = nodes.new("ShaderNodeTexNoise")
    tex.inputs["Scale"].default_value = 8
    tex.inputs["Detail"].default_value = 3
    links.new(nodes.new("ShaderNodeTexCoord").outputs["Object"], tex.inputs["Vector"])
    ramp = nodes.new("ShaderNodeValToRGB")
    for point, colour, pos in zip(ramp.color_ramp.elements, (low, high), (.18, .85)):
        point.position, point.color = pos, (*colour, 1)
    links.new(tex.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bs.inputs["Base Color"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = .12
    bump.inputs["Distance"].default_value = .018
    links.new(tex.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bs.inputs["Normal"])
    return mat

cell_skin = material("Tissue cell", (.39,.14,.098), (.72,.34,.22))
matrix = material("Extracellular matrix", (.12,.047,.046), (.37,.15,.10))
collagen = material("Matrix fibres", (.32,.12,.084), (.65,.33,.21))
lymph_wall = material("Endothelium · sage", (.079,.23,.15), (.24,.52,.32))
lymph_edge = material("Free edge", (.14,.34,.20), (.43,.67,.39))
blood_wall = material("Blood vessel wall", (.18,.039,.042), (.50,.14,.11))
blood_edge = material("Blood vessel edge", (.40,.11,.09), (.65,.25,.16))
tracer_mat = material("Fluid tracer · false colour", (.035,.42,.51), (.21,.83,.87), .19, .12)
bs = tracer_mat.node_tree.nodes.get("Principled BSDF")
bs.inputs["Emission Color"].default_value = (.18,.70,.65,1)
bs.inputs["Emission Strength"].default_value = .26
red = material("Erythrocyte", (.38,.014,.019), (.75,.052,.038), .31)

def mesh(name, verts, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    ob = bpy.data.objects.new(name, data)
    scene.collection.objects.link(ob)
    data.materials.append(mat)
    for poly in data.polygons:
        poly.use_smooth = True
    return ob

def oval(name, pos, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=36, ring_count=24, location=pos)
    ob = bpy.context.object
    ob.name, ob.scale = name, scale
    ob.data.materials.append(mat)
    for poly in ob.data.polygons:
        poly.use_smooth = True
    return ob

def fibre(name, points, radius, mat):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions, data.bevel_depth, data.bevel_resolution = "3D", radius, 3
    line = data.splines.new("NURBS")
    line.points.add(len(points)-1)
    for p, co in zip(line.points, points):
        p.co = (*co, 1)
    line.order_u = min(3,len(points))
    line.use_endpoint_u = True
    ob = bpy.data.objects.new(name, data)
    scene.collection.objects.link(ob)
    data.materials.append(mat)
    return ob

def light(name, pos, power, size, colour):
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.shape, data.size, data.color = power, "DISK", size, colour
    ob = bpy.data.objects.new(name, data)
    scene.collection.objects.link(ob)
    ob.location = pos
    ob.rotation_euler = (Vector((0,0,0))-ob.location).to_track_quat("-Z","Y").to_euler()

bpy.ops.object.camera_add(location=(0,0,9))
scene.camera = bpy.context.object
scene.camera.data.type = "ORTHO"
scene.camera.data.ortho_scale = 5.6
light("Softbox", (-3,3.7,6), 440, 4, (1,.88,.76))
light("Rim", (2,3,2.8), 180, 3, (.76,.94,1))
light("Fill", (.8,-3,3), 92, 3.5, (1,.72,.56))
oval("Matrix bed", (0,0,-1.95), (8,8,.8), matrix)
rng = random.Random(375)
for x,y,rx,ry,rot in [(-2.5,1.75,1.3,.68,-.25),(-.70,1.70,.77,.56,-.46),
                       (1.35,1.05,1.18,.59,.34),(2.65,2.6,1.2,.74,-.24),
                       (-1.7,3.05,1.18,.7,.25),(.56,3.08,1.18,.76,-.22),
                       (-2.1,-2.06,1.32,.67,.25),(.25,-2.15,1.12,.70,-.16),
                       (2.45,-2.19,1.16,.66,.24)]:
    ob = oval("Tissue cell", (x,y,-.34), (rx,ry,.48), cell_skin)
    ob.rotation_euler.z = rot
    # A soft, partially exposed nucleus gives each tissue cell a readable scale.
    nucleus = oval("Cell nucleus", (x+.17*rx,y+.04,.081), (.24*rx,.19*ry,.083), cell_skin)
    surface = ob.modifiers.new("Slight membrane undulation", "DISPLACE")
    surface.texture = bpy.data.textures.new("Cell surface", "CLOUDS")
    surface.texture.noise_scale = .40
    surface.strength = .065
    nucleus.rotation_euler.z = rot
for i in range(78):
    x, y = rng.uniform(-4,3), rng.uniform(-3.4,3.6)
    depth = rng.uniform(-1.04,-.70)
    fibre("Collagen fibril", [(x+j*.21,y+.08*math.sin(j*.5+i)+.06*j,depth) for j in range(9)],
          rng.uniform(.008,.018), collagen)

def center_y(x):
    return -.51 + .055*x + .065*math.sin(x*1.4)

radius = .59
def lip_y(x):
    return center_y(x) + radius

# A longitudinal cut removes the near half of the tube. At the inlet the
# exposed endothelium steps back so the markers pass through a real opening.
def vessel(is_lymph):
    xs = [-3.8+i*7.6/160 for i in range(161)]
    verts, opened, faces = [], [], []
    for x in xs:
        recess = min(1,max(0,min((x+.31)/.18,(.69-x)/.22))) if is_lymph else 0
        for j in range(33):
            for coordinates, cut in ((verts, 0), (opened, recess)):
                a = -math.pi/2 + (math.pi-1.06*cut)*j/32
                coordinates.append((x,center_y(x)+radius*math.sin(a),-.63*math.cos(a)))
    for i in range(len(xs)-1):
        for j in range(32):
            k = i*33+j
            faces.append((k,k+1,k+34,k+33))
    mat, edge = (lymph_wall,lymph_edge) if is_lymph else (blood_wall,blood_edge)
    wall = mesh("Longitudinal cut · lumen", verts, faces, mat)
    if is_lymph:
        wall.shape_key_add(name="Rest")
        inlet = wall.shape_key_add(name="Open inlet")
        for v, co in zip(inlet.data, opened):
            v.co = co
    thickness = wall.modifiers.new("Cell membrane thickness", "SOLIDIFY")
    thickness.thickness = .065
    result = [wall, fibre("Lower cut edge", [(x,center_y(x)-radius,.015) for x in xs],.047,edge)]
    ranges = [[x for x in xs if x < -.11],[x for x in xs if x > .92]] if is_lymph else [xs]
    for group in ranges:
        result.append(fibre("Upper cut edge", [(x,lip_y(x),.015) for x in group], .044, edge))
    for x in [-2.6,-1.15,1.82,3.1]:
        result.append(oval("Endothelial nucleus", (x,center_y(x)-radius+.038,.01), (.19,.068,.068),mat))
    return result

lymph_objects, blood_objects = vessel(True), vessel(False)
# The free edge overlaps the upstream lip at rest, then flexes inwards.
def flap_points(aperture):
    points = []
    for i in range(29):
        t = i/28
        x = .96-1.17*t+aperture*.48*t*t
        y = lip_y(x)-aperture*.53*t*t + .041*math.sin(t*math.pi)
        for j in range(16):
            a = 2*math.pi*j/16
            points.append((x,y+.051*math.sin(a),.015+.15*math.cos(a)))
    return points
verts = flap_points(0)
flap = mesh("Overlapping endothelial leaflet", verts,
            [(i*16+j,i*16+(j+1)%16,(i+1)*16+(j+1)%16,(i+1)*16+j)
             for i in range(28) for j in range(16)] +
            [tuple(range(15,-1,-1)),tuple(28*16+j for j in range(16))],lymph_edge)
flap.shape_key_add(name="Rest")
opening = flap.shape_key_add(name="Open into lumen")
for v, co in zip(opening.data,flap_points(1)):
    v.co = co
lymph_objects.append(flap)

def red_cell():
    verts, faces = [], []
    for j in range(33):
        a = -math.pi/2 + math.pi*j/32
        r = math.cos(a)
        z = .135*math.sin(a)*(.46+1.6*r*r)
        for k in range(48):
            phi = math.tau*k/48
            verts.append((.29*r*math.cos(phi),.29*r*math.sin(phi),z))
    for j in range(32):
        for k in range(48):
            faces.append((j*48+k,j*48+(k+1)%48,(j+1)*48+(k+1)%48,(j+1)*48+k))
    return mesh("Biconcave red blood cell", verts, faces, red)

discs = [red_cell() for _ in range(12)]
blood_objects += discs
tracers = [oval("Fluid marker", (0,0,0), (.087,.070,.073), tracer_mat) for _ in range(6)]
lymph_objects += tracers

def ease(t):
    t = min(1,max(0,t))
    return t*t*(3-2*t)

def motion(frame):
    lymph = frame < 84
    for ob in lymph_objects:
        ob.hide_render = not lymph
    for ob in blood_objects:
        ob.hide_render = lymph
    if lymph:
        opening.value = ease((frame-15)/15)*(1-ease((frame-59)/13))
        lymph_objects[0].data.shape_keys.key_blocks["Open inlet"].value = opening.value
        for i, ob in enumerate(tracers):
            # Each tracer remains identifiable from the intercellular corridor
            # through the same opening and along the exposed lumen.
            t = frame-i*2.6
            sx = .16 + .115*math.sin(i*1.8)
            sy = 1.36+.10*i
            first = ease((t-4)/30)
            x = sx*(1-first) + .034*first
            y = sy*(1-first) + .23*first
            cross = ease((t-34)/13)
            x += .048*cross
            y -= (.68+.032*i)*cross
            travel = ease((t-47)/32)
            x += (2.04+.07*math.cos(i))*travel
            y += center_y(x)-center_y(.082)
            x += .028*math.sin(i*2.5)
            ob.location = (x, y, .12+.025*math.sin(i))
    else:
        t = (frame-84)/83
        for i,ob in enumerate(discs):
            x = -4.9+i*.85+3.35*t
            lane = .20*math.sin(i*2.18)
            ob.location = (x,center_y(x)+lane+.037*math.sin(4*t+i),-.09+.08*math.cos(i))
            ob.rotation_euler = (.41+.38*math.sin(t*3+i),.12+.6*math.cos(t*2+i),.3*i+.32*t)
for frame in frames:
    motion(frame)
    scene.render.filepath = str(output / f"{frame:03}.jpg")
    bpy.ops.render.render(write_still=True)
