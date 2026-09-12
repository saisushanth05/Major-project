import io
import pandas as pd
import numpy as np
import statsmodels.api as sm
from scipy import stats
from typing import Dict, Any, Tuple

REQUIRED_FEATURES = ['CLEANLINESS', 'LOCATION', 'VALUE', 'ROOMS', 'SERVICE', 'SLEEP_QUALITY']
TARGET_COLUMN = 'USER_OVERALL_RATING'


def parse_csv_data(file_bytes: bytes, filename: str = "") -> pd.DataFrame:
    """
    Intelligently parses uploaded CSV data, handling metadata rows (such as
    merge-csv.com exports with 3 metadata header rows), variable encodings,
    and column naming variations.
    """
    # 1. Decode bytes into text safely
    text = None
    for enc in ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252', 'iso-8859-1']:
        try:
            text = file_bytes.decode(enc)
            break
        except (UnicodeDecodeError, LookupError):
            continue
            
    if text is None:
        text = file_bytes.decode('utf-8', errors='ignore')
        
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    
    # 2. Look for the true header line in the first 30 lines
    header_idx = None
    for idx, line in enumerate(lines[:30]):
        upper_line = line.upper().replace(' ', '_')
        if ('USER_OVERALL_RATING' in upper_line or 'OVERALL_RATING' in upper_line or 
            ('SERVICE' in upper_line and 'CLEANLINESS' in upper_line)):
            header_idx = idx
            break
            
    if header_idx is not None:
        try:
            clean_text = "\n".join(lines[header_idx:])
            df = pd.read_csv(io.StringIO(clean_text), on_bad_lines='skip')
            return clean_and_validate_dataframe(df)
        except Exception:
            pass

    # 3. Fallback: try common skip values (3 for merge-csv, 0, 1, 2, 4, 5)
    errors = []
    for skip in [3, 0, 1, 2, 4, 5]:
        try:
            df = pd.read_csv(io.BytesIO(file_bytes), skiprows=skip, on_bad_lines='skip')
            return clean_and_validate_dataframe(df)
        except Exception as e:
            errors.append(str(e))
            continue
            
    # 4. Final attempt using Python engine
    try:
        df = pd.read_csv(io.BytesIO(file_bytes), engine='python', on_bad_lines='skip')
        return clean_and_validate_dataframe(df)
    except Exception as e:
        raise ValueError(f"Failed to parse CSV file: {str(e)}")


def clean_and_validate_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Validates presence of required columns, handles column aliases,
    converts types to numeric, and drops NaN rows.
    """
    # Normalize column names: strip, replace spaces with underscores, uppercase
    normalized_cols = {}
    for c in df.columns:
        clean_name = str(c).strip().upper().replace(' ', '_')
        # Map common target aliases
        if clean_name in ['OVERALL_RATING', 'USER_RATING', 'OVERALL', 'RATING', 'USEROVERALLRATING']:
            clean_name = TARGET_COLUMN
        elif clean_name in ['SLEEPQUALITY', 'SLEEP']:
            clean_name = 'SLEEP_QUALITY'
        normalized_cols[c] = clean_name
        
    df = df.rename(columns=normalized_cols)
    
    missing = [col for col in REQUIRED_FEATURES + [TARGET_COLUMN] if col not in df.columns]
    if missing:
        raise ValueError(
            f"Uploaded CSV is missing required columns: {missing}. "
            f"Expected: {REQUIRED_FEATURES} and '{TARGET_COLUMN}'."
        )
    
    # Coerce to numeric
    for col in REQUIRED_FEATURES + [TARGET_COLUMN]:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # Drop rows with NaNs in required columns
    df_clean = df.dropna(subset=REQUIRED_FEATURES + [TARGET_COLUMN]).copy()
    
    if len(df_clean) < 10:
        raise ValueError(f"Dataset has too few valid numeric rows ({len(df_clean)}). Minimum 10 rows required.")
        
    return df_clean


def get_dataset_summary(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Computes comprehensive exploratory data analysis (EDA) statistics for frontend display.
    """
    cols = REQUIRED_FEATURES + [TARGET_COLUMN]
    stats_dict = {}
    for col in cols:
        s = df[col]
        stats_dict[col] = {
            'mean': round(float(s.mean()), 3),
            'std': round(float(s.std()), 3),
            'min': round(float(s.min()), 2),
            'q25': round(float(s.quantile(0.25)), 2),
            'median': round(float(s.median()), 2),
            'q75': round(float(s.quantile(0.75)), 2),
            'max': round(float(s.max()), 2),
        }
    
    # Distribution of target classes
    rating_counts = df[TARGET_COLUMN].value_counts().sort_index().to_dict()
    high_rating_count = int((df[TARGET_COLUMN] >= 4).sum())
    low_rating_count = int((df[TARGET_COLUMN] < 4).sum())
    
    preview = df[cols].head(15).round(2).to_dict(orient='records')
    
    return {
        'total_rows': int(len(df)),
        'total_columns': int(len(df.columns)),
        'features': REQUIRED_FEATURES,
        'target': TARGET_COLUMN,
        'summary_statistics': stats_dict,
        'rating_distribution': {str(k): int(v) for k, v in rating_counts.items()},
        'class_balance': {
            'high_rating_gte_4': high_rating_count,
            'low_rating_lt_4': low_rating_count,
            'high_pct': round(high_rating_count / len(df) * 100, 1),
            'low_pct': round(low_rating_count / len(df) * 100, 1)
        },
        'preview': preview
    }


def perform_statistical_analysis(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Performs Pearson Correlation Analysis and Ordinary Least Squares (OLS) Multiple Linear Regression.
    """
    target = TARGET_COLUMN
    features = REQUIRED_FEATURES
    
    # 1. Pearson Correlation Analysis
    corr_results = []
    for f in features:
        pearson_r, p_val = stats.pearsonr(df[f], df[target])
        corr_results.append({
            'feature': f,
            'pearson_r': round(float(pearson_r), 4),
            'p_value': float(p_val),
            'p_value_formatted': f"{p_val:.4e}" if p_val < 0.0001 else f"{p_val:.4f}",
            'is_significant': bool(p_val < 0.05),
            'direction': 'Positive' if pearson_r > 0 else 'Negative'
        })
    corr_results = sorted(corr_results, key=lambda x: x['pearson_r'], reverse=True)
    
    # 2. OLS Regression Analysis
    X = sm.add_constant(df[features])
    y = df[target]
    ols_model = sm.OLS(y, X).fit()
    
    conf_int = ols_model.conf_int()
    
    coefficients = []
    for f in features:
        coef = float(ols_model.params[f])
        std_err = float(ols_model.bse[f])
        t_stat = float(ols_model.tvalues[f])
        p_val = float(ols_model.pvalues[f])
        ci_lower = float(conf_int.loc[f, 0])
        ci_upper = float(conf_int.loc[f, 1])
        
        coefficients.append({
            'feature': f,
            'coefficient': round(coef, 4),
            'std_error': round(std_err, 4),
            't_statistic': round(t_stat, 3),
            'p_value': float(p_val),
            'p_value_formatted': f"{p_val:.4e}" if p_val < 0.0001 else f"{p_val:.4f}",
            'is_significant': bool(p_val < 0.05),
            'ci_95_lower': round(ci_lower, 4),
            'ci_95_upper': round(ci_upper, 4)
        })
    coefficients = sorted(coefficients, key=lambda x: x['coefficient'], reverse=True)
    
    intercept = {
        'coefficient': round(float(ols_model.params.get('const', 0.0)), 4),
        'std_error': round(float(ols_model.bse.get('const', 0.0)), 4),
        't_statistic': round(float(ols_model.tvalues.get('const', 0.0)), 3),
        'p_value': float(ols_model.pvalues.get('const', 0.0))
    }
    
    # 3. Non-linear factor effect trends (Sub-rating score 1 to 5 vs Mean Overall Rating)
    aspect_trends = {}
    for f in features:
        grouped = df.groupby(f)[target].mean().round(3).to_dict()
        aspect_trends[f] = {str(score): float(avg) for score, avg in sorted(grouped.items())}
        
    return {
        'pearson_correlation': corr_results,
        'ols_regression': {
            'coefficients': coefficients,
            'intercept': intercept,
            'r_squared': round(float(ols_model.rsquared), 4),
            'r_squared_adj': round(float(ols_model.rsquared_adj), 4),
            'f_statistic': round(float(ols_model.fvalue), 2) if hasattr(ols_model, 'fvalue') else 0.0,
            'f_pvalue': float(ols_model.f_pvalue) if hasattr(ols_model, 'f_pvalue') else 0.0,
            'durbin_watson': round(float(sm.stats.stattools.durbin_watson(ols_model.resid)), 3),
            'sample_size': int(ols_model.nobs)
        },
        'aspect_trends': aspect_trends
    }
