import pandas as pd
import numpy as np

# Las 7 ciudades requeridas para NACIONAL
CIUDADES_NACIONAL = {'LIMA', 'TRUJILLO', 'AREQUIPA', 'CUSCO', 'CHICLAYO', 'HUANCAYO', 'PIURA'}

def clasificar_geografico(input_file, output_file=None):
    """
    Clasifica registros como NACIONAL o por ciudad específica basándose en
    la distribución geográfica de combinaciones únicas de MEDIO+EMISORA+DIA+VERSION.

    Reglas:
    - Si aparece en las 7 ciudades: el mínimo común es NACIONAL, excedentes son de la ciudad
    - Si aparece en menos de 7 ciudades: cada registro es de su ciudad específica
    """

    # Leer Excel
    print(f"Leyendo archivo: {input_file}")
    df = pd.read_excel(input_file)
    print(f"Total de registros: {len(df)}")

    # Columnas de agrupación
    cols_grupo = ['DIA', 'MEDIO', 'EMISORA/SITE', 'VERSION']
    col_region = 'REGION/ÁMBITO'

    # Crear columna de clasificación inicializada con la región original
    df['CLASIFICACION_GEOGRAFICA'] = df[col_region].copy()

    # Agrupar y calcular conteos por región para cada grupo
    print("Analizando grupos...")

    # Crear identificador de grupo
    df['_grupo_id'] = df.groupby(cols_grupo).ngroup()

    # Para cada grupo, calcular estadísticas
    grupos = df.groupby('_grupo_id')

    total_grupos = df['_grupo_id'].nunique()
    grupos_nacionales = 0
    registros_nacionales = 0

    for grupo_id, grupo_df in grupos:
        # Contar registros por región en este grupo
        conteo_regiones = grupo_df[col_region].value_counts().to_dict()
        regiones_presentes = set(conteo_regiones.keys())

        # Verificar si están las 7 ciudades
        if regiones_presentes == CIUDADES_NACIONAL:
            # Calcular el mínimo común (cuántos son NACIONAL)
            minimo_comun = min(conteo_regiones.values())
            grupos_nacionales += 1

            # Para cada región, marcar los primeros 'minimo_comun' como NACIONAL
            for region in CIUDADES_NACIONAL:
                # Obtener índices de este grupo y región
                mask = (df['_grupo_id'] == grupo_id) & (df[col_region] == region)
                indices = df[mask].index.tolist()

                # Los primeros 'minimo_comun' son NACIONAL
                for i, idx in enumerate(indices):
                    if i < minimo_comun:
                        df.loc[idx, 'CLASIFICACION_GEOGRAFICA'] = 'NACIONAL'
                        registros_nacionales += 1
                    # Los demás mantienen su región (ya está asignada)

    # Eliminar columna auxiliar
    df.drop('_grupo_id', axis=1, inplace=True)

    # Estadísticas
    print(f"\nEstadísticas:")
    print(f"  - Total grupos únicos: {total_grupos}")
    print(f"  - Grupos con cobertura NACIONAL: {grupos_nacionales}")
    print(f"  - Registros clasificados como NACIONAL: {registros_nacionales}")
    print(f"\nDistribución final de CLASIFICACION_GEOGRAFICA:")
    print(df['CLASIFICACION_GEOGRAFICA'].value_counts())

    # Guardar resultado
    if output_file is None:
        output_file = input_file.replace('.xlsx', '_CLASIFICADO.xlsx')

    print(f"\nGuardando resultado en: {output_file}")
    df.to_excel(output_file, index=False)
    print("¡Proceso completado!")

    return df

if __name__ == "__main__":
    # Ejecutar clasificación
    df_resultado = clasificar_geografico('NACIONAL UPN.xlsx')
