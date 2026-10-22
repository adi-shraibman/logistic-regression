"""Small helpers for the logistic-regression notebooks.

Import them at the top of a notebook (the notebooks live one folder below this file):

    import sys; sys.path.insert(0, "..")
    from helpers import plot_probability_map

Each function has a short description: help(plot_probability_map).
"""
import numpy as np
import matplotlib.pyplot as plt


def sigmoid(z):
    """The logistic function 1 / (1 + e^(-z))."""
    return 1 / (1 + np.exp(-z))


def plot_probability_map(w, b, X, y, xlabel="x1", ylabel="x2", title="Predicted probability", margin=0.1):
    """Colour the plane by h(x) = sigmoid(w^T x + b) for a 2-feature model, draw the 0.5 boundary
    as a thick line, and show the data points X (shape (N, 2)) coloured by their labels y."""
    w = np.ravel(w)
    x1min, x1max = X[:, 0].min(), X[:, 0].max()
    x2min, x2max = X[:, 1].min(), X[:, 1].max()
    d1, d2 = (x1max - x1min) * margin, (x2max - x2min) * margin
    g1, g2 = np.meshgrid(np.linspace(x1min - d1, x1max + d1, 300), np.linspace(x2min - d2, x2max + d2, 300))
    probs = sigmoid(w[0] * g1 + w[1] * g2 + float(b))
    cs = plt.contourf(g1, g2, probs, levels=np.linspace(0, 1, 21), cmap="coolwarm", alpha=0.7)
    plt.contour(g1, g2, probs, levels=[0.5], colors="k", linewidths=2.5)
    plt.scatter(X[:, 0], X[:, 1], c=y, cmap="coolwarm", edgecolor="k", s=20)
    plt.colorbar(cs, label="h(x)")
    plt.xlabel(xlabel); plt.ylabel(ylabel)
    plt.title(title)
    plt.show()
