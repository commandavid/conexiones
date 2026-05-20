# 🎮 Conexiones - Juego Web

Juego minimalista inspirado en el famoso NYT Connections. Encuentra las 4 categorías conectadas en 4 intentos.

## 🚀 Desplegar en GitHub Pages

Sigue estos pasos para subir la página a GitHub Pages:

### Paso 1: Crear o usar un repositorio en GitHub

Si aún no tienes un repositorio:

```bash
# Navega a la carpeta del proyecto
cd ~/[00]\ VAULT/[02]\ PROJECTS/[00]\ CODING/GitHub/conexiones

# Inicializa un repositorio git (si no lo está ya)
git init

# Agrega los archivos
git add .

# Crea tu primer commit
git commit -m "Initial commit: Conexiones game"
```

### Paso 2: Crear el repositorio remoto en GitHub

1. Ve a https://github.com/new
2. Crea un nuevo repositorio llamado `conexiones` (o el nombre que prefieras)
3. **IMPORTANTE**: Si quieres usar `tuusuario.github.io/conexiones/`, elige un nombre cualquiera
4. Si quieres un sitio personal en `tuusuario.github.io`, nombralo exactamente `tuusuario.github.io`

### Paso 3: Vincular y empujar al repositorio remoto

```bash
# Reemplaza TU_USUARIO con tu nombre de usuario de GitHub
git remote add origin https://github.com/TU_USUARIO/conexiones.git

# Sube el código
git branch -M main
git push -u origin main
```

### Paso 4: Habilitar GitHub Pages

1. Ve a tu repositorio en GitHub (https://github.com/TU_USUARIO/conexiones)
2. Abre **Settings** (Configuración)
3. En el menú izquierdo, selecciona **Pages**
4. Bajo "Build and deployment":
   - Source: elige **Deploy from a branch**
   - Branch: selecciona **main** y la carpeta **/(root)**
5. Haz clic en **Save**

GitHub generará un enlace como:
- Si nombraste el repo `conexiones`: https://tuusuario.github.io/conexiones/
- Si nombraste el repo `tuusuario.github.io`: https://tuusuario.github.io/

### Paso 5: Espera 1-2 minutos

GitHub Pages tardará un momento en procesar. Después, tu juego estará disponible en la URL anterior.

---

## 📁 Estructura del proyecto

```
conexiones/
├── index.html          ← Archivo principal (HTML + CSS + JS)
├── test_conexiones.ipynb  ← Notebook original (no necesario para web)
└── README.md           ← Este archivo
```

---

## 🎮 Cómo jugar

1. **Selecciona tarjetas**: Haz clic en hasta 4 tarjetas que creas que están conectadas por una categoría
2. **Presiona Aceptar**: Comprueba si las 4 seleccionadas forman una categoría válida
3. **Gana**: Encuentra las 4 categorías antes de que se agoten los 4 intentos

### Categorías del juego:
- **Morado**: chupa chups, fregona, futbolín, sopa de letras
- **Azul**: sugus, pizza, vinilo, empanada
- **Verde**: chicle, llama, bultos, desayuno
- **Amarillo**: lengua, colada, chimenea, río

---

## ✏️ Personalizar el juego

### Cambiar las palabras

Abre `index.html` y encuentra la sección:

```javascript
const CATEGORIES = {
    morado: ["palabra1", "palabra2", "palabra3", "palabra4"],
    azul: ["palabra1", "palabra2", "palabra3", "palabra4"],
    // ... etc
};
```

Edita las palabras y guarda el archivo. GitHub Pages se actualizará automáticamente en 1-2 minutos.

### Cambiar los colores

En `index.html`, busca `CATEGORY_COLORS`:

```javascript
const CATEGORY_COLORS = {
    morado: "#9b59b6",   // Purple
    azul: "#3498db",     // Blue
    verde: "#2ecc71",    // Green
    amarillo: "#f1c40f"  // Yellow
};
```

Cambia los valores hexadecimales (p.ej. `#9b59b6` → `#ff1493`).

---

## 🛠️ Desarrollar localmente

Simplemente abre `index.html` en tu navegador:

```bash
# Opción 1: Doble clic en index.html desde el explorador de archivos

# Opción 2: Servir con Python (recomendado):
python3 -m http.server 8000

# Luego abre http://localhost:8000 en tu navegador
```

---

## 📝 Notas técnicas

- **Sin dependencias externas**: Vanilla HTML/CSS/JavaScript, funciona en cualquier navegador moderno
- **Responsivo**: Se adapta bien a móviles, tablets y desktop
- **Archivo único**: Todo el código está en `index.html` para facilitar el despliegue

---

## 🤝 Contribuir

Si quieres mejorar este proyecto:

1. Haz cambios en el archivo
2. Crea un commit: `git commit -m "Descripción del cambio"`
3. Empuja: `git push`

---

## 📄 Licencia

Libre de usar y modificar. ¡Diviértete! 🎉


