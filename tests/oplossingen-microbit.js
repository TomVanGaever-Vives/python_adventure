// Voorbeeldoplossingen voor het micro:bit-lab (voor de leerkracht en de automatische test).
module.exports = {
  m1: 'from microbit import *\ndisplay.show(Image.HEART)\n',
  m2: 'from microbit import *\ndisplay.scroll("Lotte")\n',
  m3: 'from microbit import *\nfor i in range(5):\n    display.show(Image.HEART)\n    sleep(500)\n    display.show(Image.HEART_SMALL)\n    sleep(500)\n',
  m4: 'from microbit import *\nfor i in range(5, 0, -1):\n    display.show(i)\n    sleep(1000)\ndisplay.show(Image.YES)\n',
  m5: 'from microbit import *\nwhile True:\n    if button_a.is_pressed():\n        display.show(Image.HAPPY)\n    elif button_b.is_pressed():\n        display.show(Image.SAD)\n',
  m6: 'from microbit import *\nteller = 0\nwhile True:\n    if button_a.was_pressed():\n        teller = teller + 1\n        display.show(teller)\n    if button_b.was_pressed():\n        teller = 0\n        display.show(teller)\n',
  m7: 'from microbit import *\nimport random\nwhile True:\n    if accelerometer.was_gesture("shake"):\n        display.show(random.randint(1, 6))\n',
  m8: 'from microbit import *\nwhile True:\n    x = accelerometer.get_x()\n    if x < -300:\n        display.show(Image.ARROW_W)\n    elif x > 300:\n        display.show(Image.ARROW_E)\n    else:\n        display.clear()\n',
  m9: 'from microbit import *\nfor i in range(5):\n    display.set_pixel(i, i, 9)\n',
  m10: 'from microbit import *\nfor x in range(5):\n    for y in range(5):\n        if (x + y) % 2 == 0:\n            display.set_pixel(x, y, 9)\n',
};
