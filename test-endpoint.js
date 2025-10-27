// Script de prueba para verificar el endpoint
const testCORS = async () => {
    try {
        console.log('🧪 Probando endpoint de salud...');
        
        const healthResponse = await fetch('https://backend-trazabilidad-4fks9p3sn-kevinpineda22s-projects.vercel.app/health', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('✅ Health check exitoso:', healthData);
        } else {
            console.log('❌ Health check falló:', healthResponse.status);
        }
        
        console.log('\n🧪 Probando endpoint de empleados (sin token)...');
        
        const empleadosResponse = await fetch('https://backend-trazabilidad-4fks9p3sn-kevinpineda22s-projects.vercel.app/api/trazabilidad/empleados/historial', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        console.log('Status empleados:', empleadosResponse.status);
        console.log('Headers de respuesta:', Object.fromEntries(empleadosResponse.headers.entries()));
        
        if (empleadosResponse.status === 401) {
            console.log('✅ CORS funciona - El endpoint responde (401 por falta de token es normal)');
        } else {
            const data = await empleadosResponse.json();
            console.log('Respuesta:', data);
        }
        
    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
        
        if (error.message.includes('CORS')) {
            console.log('🔧 El problema de CORS persiste');
        } else if (error.message.includes('fetch')) {
            console.log('🔧 Problema de conectividad de red');
        }
    }
};

// Ejecutar si es llamado directamente
if (typeof window === 'undefined') {
    // Node.js environment
    import('node-fetch').then(({ default: fetch }) => {
        globalThis.fetch = fetch;
        testCORS();
    });
} else {
    // Browser environment
    testCORS();
}