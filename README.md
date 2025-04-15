# Dashy Server

Dashy Server es un intermediario entre [Dashy](https://github.com/azapg/dashy) y [ThingsBoard](https://thingsboard.io/). Dashy inicia sesión en ThingsBoard y hace públicos los datos para que Dashy pueda usarlos.

## Instalación
Descargue el código fuente del proyecto con [Git](https://git-scm.com/):
```shell
git clone https://github.com/azapg/dashy.git
```

O descargando los archivos comprimidos [aquí](https://github.com/azapg/dashy-server/archive/refs/heads/main.zip).

Para instalar las dependencias, abre una terminal y navega hasta la carpeta del proyecto:
```shell
cd ruta/a/la/carpeta/dashy-server
```

Luego instala las dependencias con:
```shell
npm install
```
Asegúrese de tener instalado [Node.js](https://nodejs.org/en) en su computadora.
## Uso
Dashy Server requiere cierta configuración, una vez instalada las dependencias, cree un archivo llamado `.env` en la carpeta del proyecto. Este no tiene que tener ningún nombre, literalmente debe llamarse así.

Este debe incluir el siguiente contenido:
```env
THINGSBOARD_HOSTNAME=<La IP o dominio de ThingsBoard, algo como 206.189.204.114>
THINGSBOARD_PORT=<El puerto de ThingsBoard, generalmente 8080>
PUBLIC_ENTITY_ID=<El ID del dispositivo cuyos datos quiere hacer públicos>
PUBLIC_USERNAME=<Su correo o usuario de ThingsBoard>
PUBLIC_PASSWORD=<Su contraseña de ThingsBoard>
```

Ejemplo:
```properties
THINGSBOARD_HOSTNAME=206.189.204.114
THINGSBOARD_PORT=8080
PUBLIC_ENTITY_ID=3bc03140-0e4c-11f0-8393-3d26c695b56f
PUBLIC_USERNAME=tenant@thingsboard.org
PUBLIC_PASSWORD=tenant
```

Luego, puede ejecutar el servidor utilizando el siguiente comando
```shell
npm run src/index.ts
```