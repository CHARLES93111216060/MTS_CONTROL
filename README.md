# MTS · Simulador de equipo de terapia por ondas de choque (Flask)

Interfaz web de un equipo de ESWT basada en el proyecto Nextion `eme.HMI`.
Mantiene las mismas 30 páginas, la misma navegación y los parámetros de cada
protocolo, con una interfaz rediseñada (tema oscuro clínico) y una sesión de
terapia simulada.

## Cómo ejecutarla

```bash
pip install -r requirements.txt
python app.py
```

- http://localhost:5000 → arranque del equipo y menú principal
- http://localhost:5000/paginas → índice de páginas (vista nueva y clásica)
- http://localhost:5000/clasico/<pagina> → render original píxel a píxel del Nextion

## Estructura

```
app.py                 # Rutas y construcción de cada vista a partir del JSON
ui_config.py           # Textos que en el .HMI estaban dentro de las imágenes
                       # (títulos, aplicadores, notas clínicas) y definición de parámetros
hmi_pages.json         # Páginas y componentes del .HMI: navegación, rangos y valores por defecto
templates/
  base.html            # Carcasa del equipo + barra de estado
  intro.html           # Secuencia de arranque (page0)
  menu.html            # Menús (inicio, patologías, categorías)
  bodymap.html         # Mapa corporal (mapa)
  params.html          # Parámetros + sesión de terapia (protocolos y zonas)
  classic.html         # Render original del Nextion
static/js/device.js    # Escalado, reloj, estado, contador de pulsos, arranque
static/js/treatment.js # Ajuste de parámetros, verificación de seguridad y simulación
static/js/hmi.js       # Intérprete de eventos Nextion (solo vista clásica)
```

## Cómo se interpreta el .HMI

- **Tipo de página**: con video → arranque; `mapa` → mapa corporal; con sliders →
  protocolo (si está en `PROTOCOLS`) o zona anatómica; el resto → menú.
- **Navegación**: el árbol se calcula recorriendo los `page X` desde `inicio`.
- **Valores recomendados**: se leen del evento `loadend` (`h0.val=27`…) y los
  límites de cada slider (`min`/`max`). La energía se muestra como `h0 × 0,01` mJ/mm².

## Sesión de terapia simulada

1. **Iniciar terapia** abre una lista de verificación de seguridad (aplicador, gel, paciente).
2. Durante la sesión: anillo de progreso, conteo de pulsos, tiempo transcurrido/restante,
   forma de onda de presión, pausa (también con la barra espaciadora) y parada con confirmación.
   La velocidad de simulación se puede acelerar ×5 / ×20.
3. Al terminar se muestra un resumen; el contador de pulsos del aplicador
   (barra superior) se acumula en el navegador.

Se avisa si la energía supera en más de un 50 % el valor recomendado del protocolo.

## Notas

- El video de inicio del Nextion no es reproducible en web; se sustituye por una
  secuencia de autodiagnóstico (toque la pantalla para saltarla).
- En las zonas anatómicas (page3–page7) no existía número de pulsos; se añadió
  (por defecto 2000) para poder simular la sesión.
- En `mapa`, 4 de las 9 zonas (b1–b4) no tienen navegación en el .HMI y no se muestran.
# MTS_CONTROL
