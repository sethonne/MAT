Based on the Desmos screenshots provided, here are the extracted formulas and variables related to the "Car" object and its underlying controller logic.

### **Car Object Properties (from Image 1)**

The car is defined by its position, orientation, and dimensions:

* **Center:** $(t_0 + \delta, p(t_0 + \delta) + \beta)$
* **Angle:** $\theta_0 \text{ rad}$
* **Width:** $-4H$
* **Height:** $3$
* **Opacity:** $1$

---

### **Controller Logic (from Image 1)**

These variables determine the state and behavior of the car:

* **$t_1$:** $17762.76$ (Primary time variable)
* **$C_{ond}$:** $\text{floor}\left(\frac{t_1}{\max(X)}\right) = 180$
* **$H$:** $(-1)^{C_{ond}} = 1$
* **$t_0$:** $\left\{ \left| \text{mod}(C_{ond}, 2) \right| = 0 : \text{mod}(t_1, \max(X)) \right\} = 86.57$
* **$\varepsilon$:** $0.00009999999999999999$ (Slider value)

---

### **Angle and Direction Vectors (from Image 2)**

These formulas define the vectors used for the car's movement and orientation:

| Vector | Formula | Resulting Value |
| --- | --- | --- |
| **$u_0$** | $[t_0, p(t_0)]$ | $[16.6, 8.27249798504]$ |
| **$u_1$** | $[1, p'(t_0)]$ | $[1, 0.988665017752]$ |
| **$u_2$** | $[0, p''(t_0)]$ | $[0, -0.227541061757]$ |
| **$v_0$** | $\frac{u_0}{\sqrt{\text{total}(u_0^2)}} + u_0$ | $[17.495019533, 8.71852492984]$ |
| **$v_1$** | $\frac{u_1}{\sqrt{\text{total}(u_1^2)}} + u_0$ | $[17.3111255933, 8.9755629824]$ |
| **$v_2$** | $\frac{u_2}{\sqrt{\text{total}(u_2^2)}} + u_0$ | $[16.6, 7.27249798504]$ |

---

### **Summary of Functions**

While the explicit definitions of $p(t)$ (position function), $p'(t)$ (velocity/tangent), and $p''(t)$ (acceleration/curvature) are not shown in the screenshots, they are clearly used to calculate the vector coordinates and the car's center position.