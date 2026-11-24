# LAST MISSION — THE HUMAN FACTOR

Experiencia de 120 minutos para seis equipos de Seguridad de Integración de Aplicaciones (UPC).

- [Mission Control](https://last-mission-nexus.onrender.com/?role=teacher) dirige las escenas, consulta las decisiones, controla los tiempos y publica el veredicto.
- [Agent Interface](https://last-mission-nexus.onrender.com/?role=student) recibe los retos y registra votos individuales en El despertar y decisiones por equipo a partir de la configuración de permisos.
- Cinema Mode se abre desde Mission Control con un pase de un solo uso. El proyector muestra el QR de ingreso, las transmisiones, las alertas y los créditos. Activa la música y la voz desde la pantalla de proyección.

| Capítulo | Actividad |
| --- | --- |
| El despertar | Votos de confianza y matriz de seis permisos |
| El secreto prohibido | Selección de fuentes, autorización previa y minimización |
| La traición | Decisiones sobre documentos no confiables, acceso, respuestas, herramientas y consumo |
| El colapso | Contingencia con 1.000 NEXUS Coins, monitoreo y ruleta de crisis |
| La última decisión | Voto fundamentado, interrogatorio, XP del tribunal y veredicto |
| El factor humano | Seis llaves colaborativas, discurso y créditos |

Cada equipo puede obtener hasta 1.000 XP. Los NEXUS Coins son el presupuesto de la actividad de contingencia. Las llaves colaborativas no asignan XP.

## Ejecución local

Requiere Node.js 20 o superior. Configura `TEACHER_PIN` como variable de entorno antes de iniciar el servidor.

```bash
npm ci
npm start
```

La aplicación escucha en `PORT` o en el puerto 3000. El servicio existente de Render construye la aplicación desde GitHub y ejecuta `npm start`. Consulta `/health` para ver la versión activa.

## Operación de la clase

- Prepara los créditos antes de iniciar. El reinicio borra créditos, respuestas, puntuaciones y llaves, y solicita a los estudiantes ingresar otra vez.
- Para dar tiempo adicional, usa **Reabrir** antes de revelar la respuesta. La ruleta tiene un temporizador propio de 30 segundos.
- En el tribunal, revisa las justificaciones, asigna hasta 150 XP por equipo y publica el veredicto. Valida cada una de las seis llaves tras escuchar la sustentación oral.
- Usa alias y los datos ficticios incluidos en la simulación. La entrada de estudiantes admite selección de equipo. Reserva el enlace y la actividad para la clase en ese horario.
- La sesión vive en memoria de un proceso. Un reinicio o despliegue de Render pierde el estado de la clase. La sincronización usa consultas cada segundo y la voz depende de las voces instaladas en el navegador del proyector.
