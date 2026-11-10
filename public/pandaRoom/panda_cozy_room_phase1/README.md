# Panda Cozy Room — Phase 1 (10 SVG layers)

Original vector assets, portrait 1080 × 1920 shared coordinates. Each SVG is transparent except walls, floor and skyline. Place in this paint order:

01_walls, 04_seoul_skyline, 05_rain_clouds, 03_window, 02_wood_floor, 10_rug, 08_bookshelf, 09_floor_lamp, 06_armchair, 07_coffee_table.

All files use SVG groups with IDs. The armchair is intentionally at left-center; the coffee table is right foreground, leaving room for the panda to sit on the chair. Use a shared coordinate viewBox rather than scaling individual pieces separately.

For React Native, use react-native-svg or pre-render backgrounds; for Rive, import compatible vector paths and animate rain, lamp, and props separately. These are editable SVG illustrations, not .riv files or finished rigs. The skyline is stylized, not a geographically accurate Seoul panorama.
