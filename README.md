# Regressio Business AI 📈🤖
### Aplicación Inteligente para Selección, Evaluación y Simulación de Modelos de Regresión Múltiple en Negocios

Plataforma analítica profesional diseñada para científicos de datos, econometristas y directores de negocio. Permite cargar archivos Excel (`.xlsx` y `.xls`), diagnosticar la calidad de datos, formular reglas económicas de plausibilidad, entrenar y comparar modelos econométricos (OLS, Ridge, Lasso, Elastic Net, Polinómica, Interacciones) y ejecutar simulaciones de escenarios con análisis estocástico Monte Carlo.

---

## 🚀 Cómo publicar este proyecto en GitHub

Para subir este proyecto a tu propia cuenta de GitHub, sigue estos sencillos pasos desde tu terminal o consola:

### 1. Inicializar el repositorio Git local
```bash
git init
git add .
git commit -m "feat: versión inicial de Regressio Business AI"
```

### 2. Crear un repositorio en GitHub
1. Ingresa a [github.com/new](https://github.com/new).
2. Asigna un nombre al repositorio (por ejemplo: `regressio-business-ai`).
3. Deja desmarcadas las opciones de *Initialize with README*, *.gitignore* y *License* (ya están configuradas en este proyecto).
4. Haz clic en **Create repository**.

### 3. Vincular y subir tu código a GitHub
Copia y ejecuta los siguientes comandos en tu terminal (reemplazando `TU_USUARIO` por tu nombre de usuario en GitHub):

```bash
git branch -M main
git remote add origin https://github.com/TU_USUARIO/regressio-business-ai.git
git push -u origin main
```

---

## 💻 Ejecución Local

### Opción A: Aplicación Full-Stack (React 19 + Express + Vite + Tailwind)
1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Configurar la clave de API de Gemini (opcional para el Copiloto AI):
   ```bash
   cp .env.example .env
   # Edita .env y agrega tu GEMINI_API_KEY
   ```
3. Iniciar el servidor de desarrollo en el puerto 3000:
   ```bash
   npm run dev
   ```
4. Abre en tu navegador: [http://localhost:3000](http://localhost:3000)

### Opción B: Ejecución en Python con Streamlit
Si deseas ejecutar la versión en Python:
1. Instalar dependencias de Python:
   ```bash
   pip install -r requirements.txt
   ```
2. Iniciar la aplicación Streamlit:
   ```bash
   streamlit run app_streamlit.py
   ```

---

## 🛠️ Estructura de Módulos
- **Módulo 1**: Carga y reconocimiento de Excel (.xlsx, .xls y pegado de celdas).
- **Módulo 2**: Calidad y preparación de datos (nulos, duplicados, atípicos IQR e imputación adaptada).
- **Módulo 3**: Identificación y clasificación de variables con One-Hot Encoding ($k-1$).
- **Módulo 4**: Análisis exploratorio (AED), histogramas, dispersión y matriz de correlación (Pearson/Spearman).
- **Módulo 5**: Reglas de negocio y plausibilidad de signos económicos.
- **Módulo 6**: Selección inteligente de variable dependiente ($Y$) e independientes ($X$).
- **Módulo 7**: Estimación comparativa de modelos (OLS, Ridge, Lasso, Elastic Net, Polinómica, Interacciones) y diagnósticos de residuos (Durbin-Watson, Breusch-Pagan, Jarque-Bera).
- **Módulo 8**: Ecuación matemática formal, significancia ($p < 0.05$) y elasticidades calculadas.
- **Módulo 9 & 10**: Simulación de escenarios de negocio (Pesimista, Conservador, Base, Optimista, Personalizado) y análisis estocástico Monte Carlo (1.000 iteraciones).
- **Módulo 11**: Recomendaciones estratégicas no genéricas y Copiloto AI.
- **Módulo 12**: Informe ejecutivo formal de 15 puntos y exportación a libro Excel multihoja (.xlsx) o PDF.
