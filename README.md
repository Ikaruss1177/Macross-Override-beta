# VF-1A Valkyrie Arcade - Sim // Macross Overdrive - Web Demo

Prototipo web de combate aéreo y mecha en 3D inspirado en *Macross: Do You Remember Love?* y *Macross VOXP*, desarrollado con **Three.js**, **HTML5 Canvas 2D** y **Web Audio API**.

---

## Características Principales

* **Pantalla de Despliegue Orbital:** Menú de inicio táctico con vista orbital en tiempo real sobre South Ataria antes de entrar en combate.
* **Ciclo Día/Noche Sincronizado en Tiempo Real:** Iluminación dinámica vinculada automáticamente al reloj local del sistema del jugador (`Date`), con transiciones de amanecer, día, atardecer y noche profunda (incluye adelanto manual de horario para pruebas).
* **Entorno Detallado de South Ataria y Macross City:**
  * **SDF-1 Macross:** Fortaleza espacial 3D (`sdf1.glb`) estacionada en su dique seco con colisionador compuesto ajustado al casco (`OBB`).
  * **Macross City y Base Aérea U.N. Spacy:** Manzanas urbanas con veredas de baldosas, sendas peatonales, alumbrado público nocturno, edificios con ventanas iluminadas (`emissiveMap`), pistas paralelas, hangares, torre de control con radar giratorio y portaaviones en la bahía sur.
  * **Atmósfera Anime 80s:** Cielo con degradado dinámico, océano con normales animadas y cúmulos de nubes 3D volumétricas cel-shaded en movimiento.
* **Transformación en Tiempo Real:** Transición animada fluida entre los modos **Fighter**, **Gerwalk** y **Battroid** con físicas de vuelo independientes y colisiones completas con el terreno y estructuras.
* **Sistema de Control de Tiro DYRL:** HUD vectorial con retículas hexagonales enemigas, rastreadores con corchetes a 45°, **Multi-Lock simultáneo de hasta 4 blancos** e indicadores circulares de alerta para misiles entrantes.
* **Auto-Rastreo Táctico (Modo Battroid):** Sistema de fijación automática seleccionable para apuntar directamente al enemigo o al misil más cercano e interceptarlo en el aire.
* **Armamento y Efectos:** Cañón Gunpod GU-11 con proyectiles amarillo brillante difuminados (*motion blur*) y fogonazo dinámico (capaz de derribar misiles enemigos en vuelo), salva de 4 micro-misiles guiados con trayectoria en zigzag y estela de humo instanciada (`InstancedMesh`).
* **IA Enemiga Dinámica:** Unidades orbitales que atacan con disparos láser a corta distancia y lanzan salvas aleatorias de 1 o 2 misiles guiados a media y larga distancia.
* **Gestión de Daño y Térmica:** Barra de integridad de armadura con regeneración automática, chispas de impacto iluminadas, secuencia de caída a tierra y control de sobrecalentamiento de turbinas (*Overheat*).
* **Audio Dinámico en OGG:** Motor de sonido de baja latencia con música de fondo (`BGM`), controles de volumen independientes (`FX` / `BGM`), modulación continua de turbinas y alerta progresiva de misiles fijados.

---

## Controles de Vuelo y Combate

### Navegación y Pantalla de Inicio

| Tecla | Acción |
| :--- | :--- |
| **`Enter`** | **Iniciar misión** desde la pantalla de inicio |
| **`Esc`** | **Regresar** a la pantalla de inicio durante la misión |
| **`P`** | **Pausar / Reanudar** la simulación |
| **`M`** | **Silenciar / Activar** música de fondo (`BGM`) |
| **`H`** | **Adelantar reloj (+2 horas)** para probar el ciclo día/noche y la iluminación nocturna |
| **`Y` / `N`** | Tras ser derribado: **`Y`** reinicia la misión / **`N`** regresa a la pantalla de inicio |

### Transformación de Modos

| Tecla | Acción |
| :--- | :--- |
| **`F`** | Transformar a modo **Fighter** (caza supersónico) |
| **`G`** | Transformar a modo **Gerwalk** (vuelo estacionario VTOL) |
| **`B`** | Transformar a modo **Battroid** (mecha bípedo) |

### Movimiento en Modo Fighter (`F`)

| Tecla | Acción |
| :--- | :--- |
| **`W` / `S`** | Aumentar / Reducir empuje (*Throttle*) |
| **`A` / `D`** | Guiñada horizontal (*Yaw* izquierda / derecha) |
| **`Flecha Izq` / `Der`** | Alabeo (*Roll* izquierda / derecha) |
| **`Flecha Arriba` / `Abajo`** | Cabeceo (*Pitch* picada / elevación) |
| **`T`** *(mantener)* | **Turbo / Postcombustión** (vigilar temperatura de turbinas) |
| **`X`** | **Full Stop** (frenado total a 0%) |

### Movimiento y Rastreo en Modos Gerwalk (`G`) y Battroid (`B`)

| Tecla | Acción |
| :--- | :--- |
| **`W` / `S`** | Avanzar / Retroceder |
| **`A` / `D`** | Desplazamiento lateral (*Strafe* izquierda / derecha) |
| **`Flecha Izq` / `Der`** | Girar sobre el eje vertical |
| **`Flecha Arriba` / `Abajo`** | Ascender / Descender altitud |
| **`R`** *(mantener)* | Reversa rápida en modo **Gerwalk** |
| **`N`** | Alternar auto-rastreo en modo **Battroid** (`ENEMY` ➔ `MISSILE` ➔ `NONE`) |
| **`E`** | Ataque cuerpo a cuerpo con Gunpod (solo en modo **Battroid**) |

### Armamento

| Tecla | Acción |
| :--- | :--- |
| **`Shift Izq`** *(mantener)* | Disparar ráfaga continua de **Gunpod GU-11** (efectivo contra enemigos y misiles) |
| **`Espacio`** | Lanzar salva de **4 Micro-Misiles Guiados AMM-1** (repartidos en Multi-Lock) |

---

## Estructura del Proyecto

```text
macross-voxp-web/
├── index.html          # Estructura principal, precarga de modelos, pantalla de inicio y módulos
├── three.min.js        # Motor gráfico Three.js (WebGL 2.0)
├── GLTFLoader.js       # Cargador de modelos 3D GLB
├── css/
│   └── style.css       # Estilos de la pantalla de inicio, HUD y paneles de control
├── fonts/              # Tipografía Conthrax para la interfaz y el HUD
├── models/             # Modelos 3D de la Valkyrie (vf1a.glb) y la fortaleza (sdf1.glb)
├── textures/           # Secuencia de sprites para explosiones
├── sounds/             # Música de fondo (BGM), efectos de sonido y turbinas en OGG
└── js/
    ├── audio.js        # Motor Web Audio API, control de volumen y alertas progresivas
    ├── environment.js  # Isla South Ataria, Macross City, SDF-1, nubes 3D, ciclo día/noche y colisiones
    ├── hud.js          # Renderizado 2D del HUD, retículas Multi-Lock y marcadores de misiles
    ├── weapons.js      # Lógica de Gunpod, micro-misiles, humo instanciado e IA enemiga
    ├── player.js       # Animaciones, propulsores, física, gestión térmica y auto-rastreo
    └── main.js         # Bucle principal, cámara orbital de inicio, controles y estados
```

---

## Ejecución Local

Dado que el proyecto carga modelos `.glb` y archivos de audio `.ogg` mediante `fetch`, debe ejecutarse a través de un servidor web local (por ejemplo, la extensión **Live Server** en VS Code o `python -m http.server`) y no abriendo el archivo `index.html` directamente con doble clic.
