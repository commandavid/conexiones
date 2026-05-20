#!/usr/bin/env python3
"""Juego de 'conexiones' - interfaz sencilla con Tkinter.

Instrucciones:
- Ejecuta este script (por ejemplo `python3 juego_gui.py`) para abrir la ventana.
- Haz clic en hasta 4 tarjetas y pulsa "Aceptar" para comprobar si forman una solución.
- Si aciertas, las cuatro tarjetas se colorean y quedan fijadas; si fallas, se deseleccionan y pierdes un intento.
- Pierdes cuando TRIES llega a 0; ganas si adivinas las 4 categorías.
"""
import random
import tkinter as tk
from tkinter import messagebox
from typing import List, Tuple

# Listas de palabras por color
morado = ["morado1", "morado2", "morado3", "morado4"]
azul = ["azul1", "azul2", "azul3", "azul4"]
verde = ["verde1", "verde2", "verde3", "verde4"]
amarillo = ["amarillo1", "amarillo2", "amarillo3", "amarillo4"]

CATEGORIES = {
    "morado": set(morado),
    "azul": set(azul),
    "verde": set(verde),
    "amarillo": set(amarillo),
}

# Colores para marcar aciertos
CATEGORY_COLORS = {
    "morado": "#9b59b6",    # purple
    "azul": "#3498db",      # blue
    "verde": "#2ecc71",     # green
    "amarillo": "#f1c40f",  # yellow
}

# Parámetros del juego
TABLE_SIZE = 4
TRIES_INIT = 4


def generar_tabla() -> List[str]:
    """Devuelve una lista de palabras barajada con longitud TABLE_SIZE*TABLE_SIZE."""
    words: List[str] = list(morado + azul + verde + amarillo)
    expected = TABLE_SIZE * TABLE_SIZE
    if len(words) != expected:
        raise ValueError(f"number of words={len(words)} does not match TABLE_SIZE*TABLE_SIZE={expected}")
    random.shuffle(words)
    return words


class GameGUI:
    def __init__(self, master: tk.Tk):
        self.master = master
        master.title("Conexiones - Juego")

        # Estado del juego
        self.words = generar_tabla()  # list length 16
        # Map word -> (row,col) for convenience
        self.pos = {}
        self.buttons: List[tk.Button] = []
        self.selected: List[int] = []  # indices of selected buttons
        self.matched_words = set()      # palabras ya acertadas
        self.matched_categories = set()
        self.tries = TRIES_INIT

        # UI
        self.top_frame = tk.Frame(master)
        self.top_frame.pack(padx=10, pady=10)

        self.grid_frame = tk.Frame(self.top_frame)
        self.grid_frame.grid(row=0, column=0, columnspan=3)

        # Create buttons grid
        default_bg = None
        for i in range(TABLE_SIZE):
            for j in range(TABLE_SIZE):
                idx = i * TABLE_SIZE + j
                word = self.words[idx]
                btn = tk.Button(self.grid_frame, text=word, width=14, height=4, wraplength=100,
                                command=lambda idx=idx: self.toggle(idx))
                btn.grid(row=i, column=j, padx=4, pady=4)
                if default_bg is None:
                    default_bg = btn.cget("background")
                self.buttons.append(btn)
                self.pos[word] = (i, j)
        self.default_bg = default_bg
        self.selected_bg = "#d3d3d3"  # lightgray when selected

        # Controls: Aceptar button and tries label
        self.accept_button = tk.Button(self.top_frame, text="Aceptar", command=self.accept)
        self.accept_button.grid(row=1, column=0, pady=(8,0), sticky="w")

        self.tries_label = tk.Label(self.top_frame, text=f"Intentos: {self.tries}")
        self.tries_label.grid(row=1, column=1, pady=(8,0))

        self.reset_button = tk.Button(self.top_frame, text="Reiniciar", command=self.reset_game)
        self.reset_button.grid(row=1, column=2, pady=(8,0), sticky="e")

    def toggle(self, idx: int):
        """Selecciona/deselecciona una tarjeta por su índice."""
        btn = self.buttons[idx]
        word = self.words[idx]
        # ignore clicks on already matched
        if word in self.matched_words:
            return
        if idx in self.selected:
            # deselect
            self.selected.remove(idx)
            btn.config(relief=tk.RAISED, background=self.default_bg)
        else:
            if len(self.selected) >= 4:
                messagebox.showinfo("Límite", "Solo puedes seleccionar hasta 4 tarjetas antes de aceptar.")
                return
            self.selected.append(idx)
            btn.config(relief=tk.SUNKEN, background=self.selected_bg)

    def accept(self):
        """Comprueba si las cuatro seleccionadas forman una solución."""
        if len(self.selected) != 4:
            messagebox.showinfo("Selecciona 4", "Debes seleccionar exactamente 4 tarjetas antes de aceptar.")
            return
        selected_words = {self.words[i] for i in self.selected}

        # Determine if selected_words equals any category set (and that category not yet matched)
        found_category = None
        for cname, cset in CATEGORIES.items():
            if selected_words == cset and cname not in self.matched_categories:
                found_category = cname
                break

        if found_category:
            # mark as matched
            color = CATEGORY_COLORS.get(found_category, "#cccccc")
            for i in self.selected:
                btn = self.buttons[i]
                btn.config(background=color, state=tk.DISABLED, relief=tk.FLAT)
                self.matched_words.add(self.words[i])
            self.matched_categories.add(found_category)
            self.selected = []
            # Check win
            if len(self.matched_categories) == len(CATEGORIES):
                messagebox.showinfo("Ganaste", "¡Has acertado todas las categorías! Has ganado el juego.")
                self.end_game()
            else:
                messagebox.showinfo("Acierto", f"¡Correcto! Has encontrado la categoría '{found_category}'.")
        else:
            # Incorrect: deselect and decrement tries
            for i in list(self.selected):
                btn = self.buttons[i]
                btn.config(relief=tk.RAISED, background=self.default_bg)
            self.selected = []
            self.tries -= 1
            self.tries_label.config(text=f"Intentos: {self.tries}")
            if self.tries <= 0:
                messagebox.showinfo("Game Over", "Se han agotado los intentos. Fin del juego.")
                self.end_game()

    def end_game(self):
        # disable further interaction
        for btn in self.buttons:
            btn.config(state=tk.DISABLED)
        self.accept_button.config(state=tk.DISABLED)

    def reset_game(self):
        # reset state and UI
        self.words = generar_tabla()
        self.matched_words.clear()
        self.matched_categories.clear()
        self.selected = []
        self.tries = TRIES_INIT
        self.tries_label.config(text=f"Intentos: {self.tries}")
        # update buttons
        for idx, btn in enumerate(self.buttons):
            btn.config(text=self.words[idx], state=tk.NORMAL, background=self.default_bg, relief=tk.RAISED)


if __name__ == "__main__":
    root = tk.Tk()
    app = GameGUI(root)
    root.mainloop()

