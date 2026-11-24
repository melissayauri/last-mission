# LAST MISSION — THE HUMAN FACTOR

Experiencia académica interactiva de Seguridad de Integración de Aplicaciones (UPC).

## Primera versión publicada (v0.1)
- Capítulo 1: **El despertar**
- Tres vistas: `/?role=student`, `/?role=teacher`, `/?role=cinema`
- Seis equipos, registro por alias, votaciones, permisos y puntos por equipo
- Controles docentes para iniciar, cerrar, revelar y reiniciar
- Sincronización mediante consultas al servidor cada segundo

## Ejecución local
Requiere Node.js 20+.

```bash
npm start
```

Por defecto, la aplicación se inicia en http://localhost:3000. Sin `TEACHER_PIN`, una clave docente temporal se imprime en la consola. Para compartirla en Internet, configure `TEACHER_PIN` como variable secreta en Render y use HTTPS.

## Despliegue Render
- Runtime: **Node**
- Build command: `npm install`
- Start command: `npm start`
- Variable de entorno obligatoria para uso público: `TEACHER_PIN`
- Endpoint de salud: `/health`

## Alcance y límites
Esta es una **versión inicial**, no la plataforma completa de seis capítulos. Las respuestas se conservan en memoria; cuando Render reinicia o suspende el servicio, se pierde el estado de la clase. No hay base de datos persistente, invitaciones verificadas, códigos QR generados ni archivos de voz. Se aceptan alias, no deben ingresarse datos reales de clientes. La clave docente cuenta con límite básico de intentos por IP, pero aún no es un sistema de autenticación de producción.

Para impartir la clase, abrir el panel de docente, proyectar Cinema Mode en otra pantalla y compartir el enlace de estudiantes con los equipos.

**Siguiente desarrollo:** capítulo 2, El secreto prohibido.
