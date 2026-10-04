# Setup: running the notebooks on your computer

You need Python 3.10 or newer and a few packages. Choose **one** of the two options.

## Option A: Anaconda (easiest)

1. Install Anaconda from <https://www.anaconda.com/download>. It already includes Python, Jupyter,
   NumPy, pandas, matplotlib, SciPy and scikit-learn.
2. Open **Anaconda Prompt** (Windows) or a terminal (Mac/Linux) and run:
   ```
   conda install ipywidgets
   ```

## Option B: plain Python + pip

1. Install Python from <https://www.python.org/downloads/>. On Windows, tick
   **"Add Python to PATH"** during installation.
2. Open a terminal in this folder and run:
   ```
   pip install -r requirements.txt
   ```

## Starting Jupyter

In a terminal, go to the course folder and run:
```
jupyter lab
```
A browser tab opens. Double-click a notebook (for example `01_intro/01a_model_and_loss_student.ipynb`)
and run its cells from top to bottom with **Shift+Enter**.

## Checking that everything works

Run the first code cell of any notebook. If it prints
*"ipywidgets is not installed"*, the notebook still works, but with fixed pictures instead of sliders.
Install `ipywidgets` (see above) and restart Jupyter to get the sliders.
