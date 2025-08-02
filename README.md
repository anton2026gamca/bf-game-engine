# Brainf**k Game Engine

A Brainf\*\*k interpreter that includes a visual game mode with a 16x16 pixel screen. Perfect if you want a headache!

## Features

### 🧠 Full Brainf**k Interpreter
- Complete implementation of all 8 Brainf**k commands
- 256KB of memory
- Real-time syntax highlighting
- Interactive memory viewer

### 🎮 Game Mode
- **Visual Screen**: 16x16 pixel display (256 pixels total)
- **Color Support**: 256 unique colors

### 💻 Developer Features
- **Built-in Tutorial**: Learn Brainf**k step by step
- **Example Programs**: Ready-to-run code samples
- **Input/Output**: Full support for interactive programs
- **Memory Visualization**: See exactly what's happening in memory

## Usage

### Basic Brainf**k Programming
1. Open the **Code** tab
2. Write your Brainf**k code in the editor
3. Click **Run** to execute
4. View output in the output area
5. Use the **Input** field for `,` commands

### Game Mode
1. The first 256 memory cells become your 16x16 screen
2. Use the `.` command to update the screen instead of printing
3. Use the `,` command to get user input
4. Disable **Color Screen** for grayscale screen
5. Create wonderfull games and headaches!

### Brainf**k Commands
| Command | Description |
|---------|-------------|
| `>` | Move memory pointer right |
| `<` | Move memory pointer left |
| `+` | Increment value at pointer |
| `-` | Decrement value at pointer |
| `.` | Output character at pointer (or update screen in Game Mode) |
| `,` | Input character to pointer |
| `[` | Jump forward to maching `]` if current cell is 0 |
| `]` | Jump back to matching `[` if current cell is not 0 |

### Color System
When **Color Screen** is enabled, each value (0-255) maps to a unique color:
- **Hue**: `value % 16` (16 different hues)
- **Brightness**: `value / 16` (16 brightness levels)

## Example Programs

### Hello World
```brainfuck
++++++++++[>+++++++>++++++++++>+++>+<<<<-]>++.>+.+++++++..+++.>++.<<+++++++++++++++.>.+++.------.--------.>+.>.
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


***Happy coding! Create something amazing with Brainf\*\*k (or .. not so amazing, .... like a headache) 🧠✨***