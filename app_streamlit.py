"""
Regressio Business AI - Versión Python Streamlit
Plataforma analítica para selección, evaluación y simulación de regresión múltiple orientada a negocios.
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from sklearn.linear_model import LinearRegression, Ridge, Lasso, ElasticNet
from sklearn.preprocessing import PolynomialFeatures
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor
from statsmodels.stats.stattools import durbin_watson
from statsmodels.stats.diagnostic import het_breuschpagan
from scipy import stats
import io

st.set_page_config(
    page_title="Regressio Business AI",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("📈 Regressio Business AI")
st.caption("Selección, evaluación y simulación de modelos de regresión múltiple orientados a decisiones empresariales.")

# Sidebar Navigation
module = st.sidebar.radio(
    "Navegación Metodológica",
    [
        "1. Carga y Reconocimiento de Datos",
        "2. Diagnóstico de Calidad e Imputación",
        "3. Clasificación de Variables & Dummies",
        "4. Análisis Exploratorio (AED)",
        "5. Reglas de Negocio",
        "6. Modelos & Selección Econométrica",
        "7. Ecuación & Coeficientes",
        "8. Simulación de Escenarios & Monte Carlo",
        "9. Informe Ejecutivo & Exportación",
    ],
)

# Inicialización de estado de sesión
if "df" not in st.session_state:
    # Datos de demostración
    np.random.seed(42)
    n = 120
    precios = np.random.uniform(18, 26, n)
    publicidad = np.random.uniform(1500, 6000, n)
    descuentos = np.random.uniform(0, 25, n)
    temperatura = np.random.uniform(15, 32, n)
    canales = np.random.choice(["Supermercados", "Tiendas", "Ecommerce", "Mayoristas"], n)
    
    # Ecuación económica: Q = 4200 - 140*P + 0.45*Ad + 35*Desc + 18*Temp + canal + error
    canal_map = {"Supermercados": 750, "Mayoristas": 1100, "Ecommerce": 400, "Tiendas": 0}
    canal_effect = np.array([canal_map[c] for c in canales])
    unidades = 4200 - 140*precios + 0.45*publicidad + 35*descuentos + 18*temperatura + canal_effect + np.random.normal(0, 200, n)
    
    demo_df = pd.DataFrame({
        "Precio_Unitario_USD": np.round(precios, 2),
        "Inversion_Publicidad_USD": np.round(publicidad, 0),
        "Descuento_Pct": np.round(descuentos, 1),
        "Temperatura_Promedio_C": np.round(temperatura, 1),
        "Canal_Distribucion": canales,
        "Unidades_Vendidas": np.maximum(400, np.round(unidades, 0)),
    })
    st.session_state.df = demo_df
    st.session_state.target_col = "Unidades_Vendidas"

df = st.session_state.df

# ----------------- MÓDULO 1: CARGA DE ARCHIVO -----------------
if module == "1. Carga y Reconocimiento de Datos":
    st.subheader("1. Carga y Reconocimiento de Datos (.xlsx / .xls / .csv)")
    uploaded_file = st.file_uploader("Sube tu archivo Excel o CSV", type=["xlsx", "xls", "csv"])
    
    if uploaded_file is not None:
        try:
            if uploaded_file.name.endswith(".csv"):
                st.session_state.df = pd.read_csv(uploaded_file)
            else:
                xls = pd.ExcelFile(uploaded_file)
                sheet_selected = st.selectbox("Selecciona la hoja de cálculo", xls.sheet_names)
                st.session_state.df = pd.read_excel(uploaded_file, sheet_name=sheet_selected)
            st.success("¡Archivo cargado exitosamente!")
            df = st.session_state.df
        except Exception as e:
            st.error(f"Error al leer el archivo: {e}")

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total de Filas (N)", len(df))
    col2.metric("Columnas (P)", len(df.columns))
    col3.metric("Filas Duplicadas", df.duplicated().sum())
    col4.metric("Celdas Nulas", df.isna().sum().sum())

    tab_head, tab_tail = st.tabs(["Primeras 5 Filas (Head)", "Últimas 5 Filas (Tail)"])
    with tab_head:
        st.dataframe(df.head(5), use_container_width=True)
    with tab_tail:
        st.dataframe(df.tail(5), use_container_width=True)

# ----------------- MÓDULO 2: CALIDAD E IMPUTACIÓN -----------------
elif module == "2. Diagnóstico de Calidad e Imputación":
    st.subheader("2. Diagnóstico de Calidad, Atípicos e Imputación Adaptada")
    
    quality_summary = []
    for col in df.columns:
        null_count = df[col].isna().sum()
        null_pct = round((null_count / len(df)) * 100, 2)
        dtype = str(df[col].dtype)
        outliers = 0
        if pd.api.types.is_numeric_dtype(df[col]):
            q1 = df[col].quantile(0.25)
            q3 = df[col].quantile(0.75)
            iqr = q3 - q1
            outliers = ((df[col] < (q1 - 1.5 * iqr)) | (df[col] > (q3 + 1.5 * iqr))).sum()
        
        quality_summary.append({
            "Variable": col,
            "Tipo": dtype,
            "Valores Faltantes": null_count,
            "% Nulos": null_pct,
            "Atípicos (IQR)": outliers
        })
    
    st.dataframe(pd.DataFrame(quality_summary), use_container_width=True)
    
    if df.isna().sum().sum() > 0:
        if st.button("Ejecutar Imputación Adaptada"):
            for col in df.columns:
                if df[col].isna().sum() > 0:
                    if pd.api.types.is_numeric_dtype(df[col]):
                        median_val = df[col].median()
                        df[col].fillna(median_val, inplace=True)
                    else:
                        mode_val = df[col].mode()[0]
                        df[col].fillna(mode_val, inplace=True)
            st.success("Imputación completada exitosamente.")
            st.session_state.df = df
    else:
        st.info("El dataset no presenta valores faltantes.")

# ----------------- MÓDULO 4: ANÁLISIS EXPLORATORIO -----------------
elif module == "4. Análisis Exploratorio (AED)":
    st.subheader("4. Análisis Exploratorio de Datos (AED)")
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    st.markdown("#### Estadísticas Descriptivas")
    st.dataframe(df.describe().T, use_container_width=True)
    
    st.markdown("#### Matriz de Correlación")
    method = st.radio("Método", ["pearson", "spearman"], horizontal=True)
    corr = df[num_cols].corr(method=method)
    fig_corr = px.imshow(corr, text_auto=True, color_continuous_scale="RdBu_r", aspect="auto")
    st.plotly_chart(fig_corr, use_container_width=True)

# ----------------- MÓDULO 6: MODELOS -----------------
elif module == "6. Modelos & Selección Econométrica":
    st.subheader("6. Selección y Evaluación Comparativa de Modelos")
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    target = st.selectbox("Variable Dependiente (Y)", num_cols, index=len(num_cols)-1)
    st.session_state.target_col = target
    
    features = [c for c in num_cols if c != target]
    selected_features = st.multiselect("Variables Independientes (X)", features, default=features)
    
    if len(selected_features) > 0:
        X = df[selected_features]
        y = df[target]
        
        # OLS con statsmodels
        X_const = sm.add_constant(X)
        ols_model = sm.OLS(y, X_const).fit()
        
        # Regularizaciones
        ridge = Ridge(alpha=1.0).fit(X, y)
        lasso = Lasso(alpha=0.5).fit(X, y)
        enet = ElasticNet(alpha=0.5, l1_ratio=0.5).fit(X, y)
        
        # Tabla comparativa
        models_data = [
            {"Modelo": "OLS Tradicional", "R²": ols_model.rsquared, "R² Adj": ols_model.rsquared_adj, "AIC": ols_model.aic, "BIC": ols_model.bic},
            {"Modelo": "Ridge (L2)", "R²": r2_score(y, ridge.predict(X)), "R² Adj": 1 - (1 - r2_score(y, ridge.predict(X)))*(len(y)-1)/(len(y)-X.shape[1]-1), "AIC": "-", "BIC": "-"},
            {"Modelo": "Lasso (L1)", "R²": r2_score(y, lasso.predict(X)), "R² Adj": 1 - (1 - r2_score(y, lasso.predict(X)))*(len(y)-1)/(len(y)-X.shape[1]-1), "AIC": "-", "BIC": "-"},
            {"Modelo": "Elastic Net", "R²": r2_score(y, enet.predict(X)), "R² Adj": 1 - (1 - r2_score(y, enet.predict(X)))*(len(y)-1)/(len(y)-X.shape[1]-1), "AIC": "-", "BIC": "-"},
        ]
        st.dataframe(pd.DataFrame(models_data), use_container_width=True)
        
        st.markdown("#### Resumen Econométrico OLS")
        st.text(ols_model.summary())

# ----------------- MÓDULO 8: SIMULACIÓN & MONTE CARLO -----------------
elif module == "8. Simulación de Escenarios & Monte Carlo":
    st.subheader("8. Simulación de Escenarios de Negocio & Monte Carlo")
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    target = st.session_state.target_col
    features = [c for c in num_cols if c != target]
    
    X = df[features]
    y = df[target]
    model = LinearRegression().fit(X, y)
    
    st.markdown("#### Ajuste de Variables en Tiempo Real")
    inputs = {}
    cols = st.columns(min(3, len(features)))
    for idx, feat in enumerate(features):
        with cols[idx % len(cols)]:
            min_v = float(df[feat].min())
            max_v = float(df[feat].max())
            mean_v = float(df[feat].mean())
            inputs[feat] = st.slider(f"{feat}", min_v * 0.7, max_v * 1.3, mean_v)
    
    sim_df = pd.DataFrame([inputs])
    pred_val = model.predict(sim_df)[0]
    base_val = model.predict(pd.DataFrame([df[features].mean()]))[0]
    diff_pct = ((pred_val - base_val) / base_val) * 100
    
    st.metric(f"Predicción de {target}", f"{pred_val:,.1f}", f"{diff_pct:+.1f}% vs Base")
    
    # Monte Carlo
    st.markdown("#### Simulación Monte Carlo (1.000 iteraciones)")
    std_err = np.std(y - model.predict(X))
    mc_results = np.random.normal(pred_val, std_err, 1000)
    fig_mc = px.histogram(mc_results, nbins=30, title="Distribución de Probabilidad del Resultado")
    st.plotly_chart(fig_mc, use_container_width=True)

# ----------------- MÓDULO 9: INFORME EJECUTIVO -----------------
elif module == "9. Informe Ejecutivo & Exportación":
    st.subheader("9. Informe Ejecutivo & Exportación")
    st.write("Generación del informe gerencial de 15 puntos ordenados y exportación a Excel.")
    
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Dataset_Procesado", index=False)
        df.describe().to_excel(writer, sheet_name="Estadisticas_Descriptivas")
    
    st.download_button(
        label="📥 Descargar Reporte en Excel (.xlsx)",
        data=buffer.getvalue(),
        file_name="Reporte_Regresion_Empresarial.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )

else:
    st.info("Selecciona un módulo en la barra lateral para continuar.")
