import 'dotenv/config';

function bool(v: string | undefined, def = false) {
    if (v === undefined) return def;
    return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

export const config = {
    port: Number(process.env.PORT ?? 4000),
    jwtSecret: process.env.JWT_SECRET ?? 'devsecret',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
        .split(',').map(s => s.trim()),

    ss: {
        user: process.env.SS_USER ?? '',
        apiKey: process.env.SS_API_KEY ?? '',
        enable: bool(process.env.SS_ENABLE)
    },

    sanmar: {
        customerNumber: process.env.SANMAR_CUSTOMER_NUMBER ?? '',
        username: process.env.SANMAR_USERNAME ?? '',
        password: process.env.SANMAR_PASSWORD ?? '',
        wsdlUrl: process.env.SANMAR_WSDL_URL ?? '',
        enable: bool(process.env.SANMAR_ENABLE),
        sftp: {
            host: process.env.SANMAR_SFTP_HOST ?? '',
            user: process.env.SANMAR_SFTP_USER ?? '',
            password: process.env.SANMAR_SFTP_PASSWORD ?? '',
            enable: bool(process.env.SANMAR_SFTP_ENABLE)
        }
    }
};
