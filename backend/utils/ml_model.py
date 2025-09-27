def predict_risk(features):
    vibration, rainfall, temperature = features
    if vibration > 70 or rainfall > 100:
        return "High Risk"
    elif vibration > 40:
        return "Medium Risk"
    else:
        return "Low Risk"