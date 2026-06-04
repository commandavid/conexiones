// Puzzles archive
// Each puzzle contains categories (color->words), titles (color->title) and an optional date or label.
const PUZZLES = [
    {
        date: "2026-06-01",
        label: "Primer puzzle",
        categories: {
            morado: ["chupa chups", "fregona", "futbolín", "sopa de letras"],
            azul: ["sugus", "pizza", "vinilo", "empanada"],
            verde: ["chicle", "llama", "bultos", "desayuno"],
            amarillo: ["lengua", "colada", "chimenea", "río"]
        },
        titles: {
            morado: "Inventos españoles",
            azul: "packaging cuadrado",
            verde: "princesas de hora de aventuras",
            amarillo: "elementos en un volcán"
        }
    },
    // Older example puzzle
    {
        date: "2026-05-30",
        label: "Animales",
        categories: {
            morado: ["gato", "vaca", "pulpo", "burro"],
            azul: ["grillo", "búho", "tortuga", "elefante"],
            verde: ["conejo", "pato", "cerdo", "correcaminos"],
            amarillo: ["nutria", "manatí", "ballena", "foca"]
        },
        titles: {
            morado: "Herramientas",
            azul: "Asociados con la sabiduría",
            verde: "Looney Toons",
            amarillo: "Mamíferos marinos"
        }
    },

    {
        date: "2026-06-02",
        label: "No hay dos sin tres",
        categories: {
            morado: ["bajo", "punto", "posición", "corriente"],
            verde: ["escudo", "doblón", "franco", "corona"],
            azul: ["sobre", "albarán", "filatelia", "giro"],
            amarillo: ["espada", "globo", "payaso", "gato"]
        },
        titles: {
            morado: "contra____",
            azul: "Relativo a lo postal",
            verde: "Monedas",
            amarillo: "Pez"
        }
    },

    {
        date: "2026-06-03",
        label: "Matemático!",
        categories: {
            morado: ["1", "✖️", "2", "⚽️"],
            azul: ["4", "➕", "25", "➗"],
            verde: ["451", "300", "7", "11"],
            amarillo: ["67", "69", "420", "21"]
        },
        titles: {
            morado: "Quiniela",
            azul: "Discos más vendidos de los 2000s",
            verde: "Números de títulos de películas",
            amarillo: "Funny number"
        }
    }
];


