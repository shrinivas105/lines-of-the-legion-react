from PIL import Image
from pathlib import Path
path = Path('src/assets/title.png')
img = Image.open(path)
print('mode', img.mode)
bbox = img.getbbox()
print('bbox', bbox)
if bbox:
    cropped = img.crop(bbox)
    cropped.save(path)
    print('saved', path, 'size', cropped.size)
else:
    print('no bbox found')
