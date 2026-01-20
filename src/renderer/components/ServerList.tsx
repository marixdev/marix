import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  icon?: string;
  protocol?: 'ssh' | 'ftp' | 'ftps' | 'rdp' | 'wss' | 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'sqlite';
  wssUrl?: string;
  tags?: string[];
}

interface Props {
  servers: Server[];
  onConnect: (server: Server) => void;
  onConnectSFTP?: (server: Server) => void;
  onEdit: (server: Server) => void;
  onDelete: (id: string) => void;
  onShareOnLAN?: (serverIds: string[]) => void;
  selectedServerIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

// Protocol colors and icons
const PROTOCOL_CONFIG: Record<string, { color: string; bgColor: string; icon: React.ReactNode; label: string }> = {
  ssh: { 
    color: '#10b981', 
    bgColor: 'bg-emerald-500/10',
    label: 'SSH',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  rdp: { 
    color: '#3b82f6', 
    bgColor: 'bg-blue-500/10',
    label: 'RDP',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  },
  ftp: { 
    color: '#f59e0b', 
    bgColor: 'bg-amber-500/10',
    label: 'FTP',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    )
  },
  ftps: { 
    color: '#f97316', 
    bgColor: 'bg-orange-500/10',
    label: 'FTPS',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )
  },
  wss: { 
    color: '#8b5cf6', 
    bgColor: 'bg-violet-500/10',
    label: 'WSS',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    )
  },
  // Database protocols - Official logos
  mysql: { 
    color: '#00758f', 
    bgColor: 'bg-transparent',
    label: 'MySQL',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 48 48">
        <path fill="#00796b" d="M0.002,35.041h1.92v-7.085l2.667,6.057c0.329,0.755,0.779,1.022,1.662,1.022 s1.315-0.267,1.644-1.022l2.667-5.902v6.93h1.92v-7.906c0-0.61-0.277-0.917-0.807-1.054c-1.286-0.373-2.138,0.089-2.525,0.986 l-2.7,6.069l-2.613-6.069c-0.37-0.897-1.239-1.359-2.524-0.986c-0.531,0.137-0.808,0.444-0.808,1.054v7.906H0.002z"/>
        <path fill="#00796b" d="M13.441,29.281h1.92v4.055c-0.015,0.2,0.064,0.731,0.99,0.745c0.472,0.008,2.821,0,2.85,0v-4.8h1.92 c0,0,0,5.417,0,5.529c0,0.617-0.559,1.239-1.2,1.44c-0.263,0.085-3.479,0-3.479,0c-1.845,0-3.001-0.962-3.001-1.8V29.281z"/>
        <path fill="#f57f17" d="M21.722,34.063v2.718c0,0.267,0.053,0.457,0.16,0.57c0.054,0.057,0.16,0.125,0.294,0.181 c0.227,0.089,0.48,0.131,0.751,0.131h0.16v0.377h-4.451v-0.377h0.16c0.535,0,0.925-0.144,1.145-0.42 c0.107-0.125,0.16-0.342,0.16-0.627v-6.262c0-0.285-0.053-0.502-0.16-0.627c-0.22-0.269-0.609-0.413-1.145-0.413h-0.16v-0.377 h4.078v0.377h-0.16c-0.535,0-0.925,0.144-1.145,0.42c-0.107,0.125-0.16,0.342-0.16,0.62v3.411h4.238v-3.411 c0-0.285-0.053-0.502-0.16-0.627c-0.22-0.269-0.609-0.413-1.145-0.413h-0.16v-0.377h4.078v0.377h-0.16 c-0.535,0-0.925,0.144-1.145,0.42c-0.107,0.125-0.16,0.342-0.16,0.62v6.269c0,0.267,0.053,0.457,0.16,0.57 c0.054,0.057,0.16,0.125,0.294,0.181c0.227,0.089,0.48,0.131,0.751,0.131h0.16v0.377h-4.451v-0.377h0.16 c0.535,0,0.925-0.144,1.145-0.42c0.107-0.125,0.16-0.342,0.16-0.627v-2.553L21.722,34.063z"/>
        <path fill="#00796b" d="M27.762,36.205c-0.327-0.136-0.601-0.167-0.848-0.167c-0.604,0-0.941,0.369-0.941,0.833 c0,1.069,2.182,0.748,2.182,2.507c0,0.935-0.724,1.612-1.727,1.612c-0.509,0-0.991-0.123-1.363-0.321l0.218-0.656 c0.277,0.161,0.644,0.283,1.037,0.283c0.576,0,0.988-0.328,0.988-0.894c0-1.135-2.173-0.796-2.173-2.473 c0-0.859,0.628-1.583,1.671-1.583c0.422,0,0.808,0.091,1.1,0.24L27.762,36.205z"/>
        <path fill="#00796b" d="M31.369,37.005c0.349,0,0.678,0.082,0.962,0.231l-0.199,0.614c-0.245-0.148-0.521-0.222-0.805-0.222 c-0.89,0-1.613,0.709-1.613,1.584s0.723,1.584,1.613,1.584c0.283,0,0.559-0.074,0.805-0.222l0.199,0.614 c-0.285,0.148-0.613,0.231-0.962,0.231c-1.267,0-2.294-0.988-2.294-2.207S30.102,37.005,31.369,37.005z"/>
        <path fill="#00796b" d="M33.239,35.539h0.848v2.138c0.272-0.385,0.716-0.672,1.312-0.672c0.935,0,1.488,0.681,1.488,1.592v2.764 h-0.848v-2.523c0-0.652-0.331-1.135-0.972-1.135c-0.637,0-1.079,0.571-1.079,1.21v2.448h-0.749V35.539z"/>
        <path fill="#00796b" d="M38.455,38.263c-0.058-0.453-0.387-0.699-0.845-0.699c-0.422,0-0.769,0.21-0.943,0.699H38.455z M36.659,38.84 c0.016,0.707,0.459,1.173,1.102,1.173c0.467,0,0.801-0.237,0.966-0.607h0.823c-0.202,0.731-0.864,1.233-1.772,1.233 c-1.147,0-1.975-0.878-1.975-2.182c0-1.245,0.861-2.207,1.959-2.207c1.16,0,1.896,0.944,1.896,2.034c0,0.123-0.008,0.303-0.033,0.398 c-0.008,0.058-0.024,0.116-0.024,0.157H36.659z"/>
        <path fill="#00796b" d="M40.12,37.109h0.699v0.606h0.017c0.222-0.418,0.646-0.71,1.181-0.71c0.198,0,0.339,0.025,0.438,0.058v0.706 c-0.099-0.033-0.281-0.074-0.513-0.074c-0.687,0-1.072,0.564-1.072,1.438v2.228h-0.749V37.109z"/>
        <path fill="#00796b" d="M45.073,38.263c-0.058-0.453-0.387-0.699-0.845-0.699c-0.422,0-0.769,0.21-0.943,0.699H45.073z M43.276,38.84 c0.016,0.707,0.459,1.173,1.102,1.173c0.467,0,0.801-0.237,0.966-0.607h0.823c-0.202,0.731-0.864,1.233-1.772,1.233 c-1.147,0-1.975-0.878-1.975-2.182c0-1.245,0.861-2.207,1.959-2.207c1.16,0,1.896,0.944,1.896,2.034c0,0.123-0.008,0.303-0.033,0.398 c-0.008,0.058-0.024,0.116-0.024,0.157H43.276z"/>
        <path fill="#00796b" d="M47.929,35.539v5.822h-0.749v-5.822H47.929z"/>
        <path fill="#00796b" d="M24.124,10.651c-0.306-0.048-0.527-0.078-0.769-0.078 c-2.755,0-4.138,1.398-4.138,4.183v1.107h-1.721v1.453h1.721v7.291h1.873v-7.291h2.426v-1.453h-2.426v-1.003 c0-1.729,0.549-2.528,1.909-2.528c0.384,0,0.742,0.036,1.125,0.108V10.651L24.124,10.651z"/>
        <path fill="#00796b" d="M25.523,24.608l4.096-10.17h1.863l4.139,10.17h-2.006l-0.996-2.566h-4.225l-0.971,2.566H25.523z M28.953,20.586h3.188l-1.573-4.197L28.953,20.586z"/>
        <path fill="#00796b" d="M25.146,14.438h1.873v10.17h-1.873V14.438z"/>
      </svg>
    )
  },
  postgresql: { 
    color: '#336791', 
    bgColor: 'bg-transparent',
    label: 'PostgreSQL',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24">
        <path fill="#336791" d="M23.5594 14.7228a.5269.5269 0 0 0-.0563-.1191c-.139-.2632-.4768-.3418-1.0074-.2322-1.6533.3418-2.2203.0563-2.3562-.0715.7754-1.4346 1.4071-3.0761 1.5488-4.2515.0808-.6719.1606-1.5736-.1236-2.3421-.4895-1.3259-1.0909-2.6196-1.8065-3.8561-.5633-.9739-1.4193-2.5659-2.4258-3.3223-3.0167-2.2702-6.8258-2.3421-8.0387-2.2812-.4014.0211-.8029.0702-1.1963.1587-.9659.2183-1.8667.6117-2.6522 1.1502L6.9696 3.4402c-.6895-.0211-1.4396.1026-2.1855.4025C3.0968 4.5384 1.5682 5.8446.8235 7.7994c-.57 1.4996-.5782 3.1307-.5313 4.0119.0141.2602.0352.5063.0703.7384.0633.4166.1711.9048.3259 1.4489-.0352.0587-.0668.1215-.0914.1878-.8589 2.315-.9225 4.5512-.1641 6.0882.6895 1.4006 1.9775 2.3456 3.7368 2.7424.7614.1719 1.6211.2578 2.5517.2578.704 0 1.4607-.0563 2.2489-.1688 1.3977-.2004 2.8687-.5768 4.2469-1.0899a16.5741 16.5741 0 0 0 2.3844-1.0793c.7331.0809 1.5523.1196 2.4019.1196 1.9375 0 4.1152-.295 5.7896-.9299.8378-.3173 1.7379-.858 1.8843-1.7061.0774-.4482-.0645-.9369-.4189-1.4453zm-3.2533-.8555c-.4887 1.4176-1.1397 2.7744-1.9469 4.0492-.0598.095-.0915.2042-.091.3159 0 .0809.0247.3335.6403.5513.359.1278.8153.1949 1.3166.1949.5836 0 1.2296-.0895 1.86-.2426-.0844.1898-.2326.3631-.4541.5176-.8764.6106-2.7287 1.1256-4.8568 1.1256-.7612 0-1.4877-.0598-2.1543-.1781a.499.499 0 0 0-.3582.0598c-.4611.279-.9399.5372-1.4334.7738-1.7305.8272-3.6054 1.3724-5.2905 1.5389-2.7674.2725-4.6377-.1898-5.4695-1.3506-.8529-1.1924-.8022-3.1729-.0633-5.1758.0387.0528.0809.1019.127.1476.4611.4588 1.1655.6554 2.0933.586.5098-.0387 1.0602-.1336 1.6363-.2825 1.0355-.2725 2.1824-.6964 3.3188-1.2261.4751-.2218.9369-.4647 1.3752-.7263.172-.1019.3405-.2076.5055-.3168a.5.5 0 0 0 .2079-.5687c-.069-.2113-.2691-.3573-.4922-.3597-.1148-.0012-.2285.0281-.3317.0856-.0973.0563-.1969.1091-.2988.1588-2.4399 1.1888-5.3118 1.9469-7.1382 1.9328-.8942-.0071-1.3764-.2183-1.5065-.4084-.2725-.3967-.3088-.9967-.1898-1.6363.069-.3688.1969-.768.3785-1.1888a6.6548 6.6548 0 0 0 .5547-1.8065c.0949-.5941.1898-1.1996.29-1.8065.0914-.5504.2007-1.093.3265-1.6293.1898-.8091.4258-1.5922.7032-2.3421.3547-.9615 1.0355-2.3562 1.8696-3.3082C6.0648 4.4507 6.9063 3.7754 7.6898 3.4402c.491-.2104 1.0145-.3312 1.5488-.359.4541-.0247.9082-.0141 1.3584.0317.8166.0774 1.754.2725 2.7358.5863 1.8878.6047 3.9193 1.5629 5.494 2.5881.5945.3865 1.1361.8295 1.6141 1.3189 1.2377 1.2753 2.1331 3.6901 2.2027 5.0107.069 1.3153-.139 2.3878-.6192 3.1904zm-6.4697-3.1307c-.0211-.2288-.1711-.4506-.3828-.564-.4927-.2639-.9784-.4805-1.4534-.6489-.3371-.1196-.706-.2042-1.0992-.2495-.3828-.044-.7936-.0669-1.2296-.0669-.4084 0-.8167.0211-1.218.0633-.0105.0012-.0211.003-.0317.0035-.0105.0006-.0211.0018-.0317.0035l-.0281.0035-.0246.0035c-.0105.0023-.0211.0041-.0317.007a.4895.4895 0 0 0-.3547.2355l-.0035.0071-.0035.007a.4841.4841 0 0 0 .0563.5512l.0035.0036.0035.0035a.4988.4988 0 0 0 .1652.1231l.007.0035.007.0035.0211.0071.0211.0071a.5047.5047 0 0 0 .1371.0317c.014.0018.0282.0024.0423.003l.0141.0006h.0141c.2795-.0317.5624-.0598.8452-.0844.5664-.0493 1.1362-.0738 1.7026-.0738.3125 0 .6262.0106.9416.0317a5.711 5.711 0 0 1 1.3188.2355c.4858.1406.9435.3336 1.3612.5757a.498.498 0 0 0 .6188-.0527.4977.4977 0 0 0 .1407-.6117l-.0035-.0071-.0035-.0071-.0035-.0071-.0036-.007z"/>
      </svg>
    )
  },
  mongodb: { 
    color: '#47a248', 
    bgColor: 'bg-transparent',
    label: 'MongoDB',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24">
        <path fill="#47a248" d="M17.193 9.555c-1.264-5.58-4.252-7.414-4.573-8.115-.28-.394-.53-.954-.735-1.44-.036.495-.055.685-.523 1.184-.723.566-4.438 3.682-4.74 10.02-.282 5.912 4.27 9.435 4.888 9.884l.07.05A73.49 73.49 0 0111.91 24h.481c.114-1.032.284-2.056.51-3.07.417-.296.604-.463.85-.693a11.342 11.342 0 003.639-8.464c.01-.814-.103-1.662-.197-2.218zm-5.336 8.195s0-8.291.275-8.29c.213 0 .49 10.695.49 10.695-.381-.045-.765-1.76-.765-2.405z"/>
      </svg>
    )
  },
  redis: { 
    color: '#dc382d', 
    bgColor: 'bg-transparent',
    label: 'Redis',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24">
        <path fill="#dc382d" d="M10.5 2.661l-8.571 4.062c-.309.146-.309.422 0 .568l8.571 4.062c.346.163.727.163 1.073 0l8.571-4.062c.309-.146.309-.422 0-.568l-8.571-4.062c-.346-.163-.727-.163-1.073 0zM1.929 9.405l8.571 4.062c.346.163.727.163 1.073 0l8.571-4.062c.309-.146.309-.422 0-.568-.309-.146-.818-.146-1.127 0l-7.944 3.77c-.346.163-.727.163-1.073 0l-7.944-3.77c-.309-.146-.818-.146-1.127 0-.309.146-.309.422 0 .568zM1.929 13.405l8.571 4.062c.346.163.727.163 1.073 0l8.571-4.062c.309-.146.309-.422 0-.568-.309-.146-.818-.146-1.127 0l-7.944 3.77c-.346.163-.727.163-1.073 0l-7.944-3.77c-.309-.146-.818-.146-1.127 0-.309.146-.309.422 0 .568z"/>
      </svg>
    )
  },
  sqlite: { 
    color: '#003b57', 
    bgColor: 'bg-transparent',
    label: 'SQLite',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24">
        <path fill="#003b57" d="M21.678.521c-1.032-.92-2.28-.55-3.678.618A38.019 38.019 0 0 0 16.463 2.5c-1.586 1.683-3.726 4.32-5.141 6.486-.053.026-.095.044-.148.076-.714.42-1.46.868-2.19 1.345-.099-.152-.462-.209-.923-.146A7.91 7.91 0 0 1 6.9 10.4a1.553 1.553 0 0 1-.09.01 2.76 2.76 0 0 1-.142.007h-.074c-.16.003-.288.019-.358.047-.082.032-.13.076-.137.128-.01.072.04.17.139.282.015.018.037.039.055.058.033.035.071.073.11.113.041.042.085.088.13.135.022.024.045.05.068.075.14.157.294.34.454.549-.024.039-.047.078-.071.119a87.23 87.23 0 0 0-2.06 3.769C3.694 17.925 2.14 20.747.67 23.095c-.12.19-.029.356.114.455.037.026.08.046.127.061.053.017.11.028.168.034.082.007.168.002.248-.014.093-.02.181-.053.255-.1.108-.067.194-.16.244-.275a46.79 46.79 0 0 1 1.595-2.936c.115-.196.35-.472.65-.745.147-.133.31-.262.48-.379.142-.098.29-.186.437-.262.135-.069.284-.153.447-.25l.018-.011.018-.01c.155-.091.323-.194.504-.31.086-.054.175-.112.266-.172.02.114.075.299.166.557.055.154.12.33.195.53.185.496.408 1.108.578 1.795.174.699.294 1.467.267 2.257a.195.195 0 0 0 .029.11.166.166 0 0 0 .067.06c.021.01.044.017.068.019.031.003.065-.001.097-.011a.206.206 0 0 0 .07-.036.2.2 0 0 0 .052-.058.174.174 0 0 0 .023-.059c.206-.933.328-1.747.386-2.445a9.284 9.284 0 0 0-.095-2.143c.25-.156.498-.315.746-.477.088-.057.175-.115.262-.172.153.188.306.383.46.583.296.39.592.808.87 1.246.178.28.348.571.503.867.101.192.196.387.282.58.053.12.103.24.149.358.043.109.083.217.119.322.054.157.1.306.136.443.029.107.053.207.071.297.04.195.058.348.053.448a.194.194 0 0 0 .016.091c.012.03.032.054.058.072a.18.18 0 0 0 .164.014.228.228 0 0 0 .062-.037.24.24 0 0 0 .045-.046.195.195 0 0 0 .032-.055l.01-.024c.01-.029.024-.068.041-.117a4.37 4.37 0 0 0 .055-.16 6.817 6.817 0 0 0 .139-.518 8.38 8.38 0 0 0 .108-.561 9.61 9.61 0 0 0 .101-.87c.039-.52.042-1.14-.048-1.847a9.786 9.786 0 0 0-.22-1.12c.184-.142.369-.286.554-.43.064-.05.128-.1.192-.15.009.011.019.02.028.031.024.03.047.055.068.077z"/>
      </svg>
    )
  },
};

const ServerList: React.FC<Props> = ({ 
  servers, 
  onConnect,
  onConnectSFTP,
  onEdit, 
  onDelete, 
  onShareOnLAN,
  selectedServerIds = [],
  onSelectionChange,
}) => {
  const { t } = useLanguage();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; server: Server } | null>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);

  // Get all unique tags from servers
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    servers.forEach(server => {
      server.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [servers]);

  // Get tag statistics (count servers per tag)
  const tagStats = useMemo(() => {
    const stats: { [tag: string]: number } = {};
    servers.forEach(server => {
      server.tags?.forEach(tag => {
        stats[tag] = (stats[tag] || 0) + 1;
      });
    });
    return stats;
  }, [servers]);

  // Select servers by tag
  const selectByTag = (tag: string) => {
    if (!onSelectionChange) return;
    const serversByTag = servers.filter(s => s.tags?.includes(tag)).map(s => s.id);
    const newSelection = [...new Set([...selectedServerIds, ...serversByTag])];
    onSelectionChange(newSelection);
    setShowTagSelector(false);
  };

  // Toggle server selection
  const toggleSelection = (serverId: string) => {
    if (!onSelectionChange) return;
    
    const newSelection = selectedServerIds.includes(serverId)
      ? selectedServerIds.filter(id => id !== serverId)
      : [...selectedServerIds, serverId];
    
    onSelectionChange(newSelection);
  };

  // Select all visible servers
  const selectAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(filteredServers.map(s => s.id));
  };

  // Clear selection
  const clearSelection = () => {
    if (!onSelectionChange) return;
    onSelectionChange([]);
    setIsMultiSelectMode(false);
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setShowTagSelector(false);
    };
    if (contextMenu || showTagSelector) {
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [contextMenu, showTagSelector]);

  const handleContextMenu = (e: React.MouseEvent, server: Server) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, server });
  };

  // Filter servers by search
  const filteredServers = useMemo(() => {
    if (!searchTerm.trim()) return servers;
    const term = searchTerm.toLowerCase();
    return servers.filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.host.toLowerCase().includes(term) ||
      s.username.toLowerCase().includes(term) ||
      s.tags?.some(tag => tag.toLowerCase().includes(term))
    );
  }, [servers, searchTerm]);

  // Empty state
  if (servers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <div className="w-16 h-16 rounded-full bg-navy-800 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-white mb-1">{t('noHostsConfigured') || 'No servers configured'}</h3>
        <p className="text-sm text-gray-500">{t('clickNewHostToStart') || 'Click "Add New Host" to add your first server'}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search and LAN Discovery Toggle */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 space-y-2">
        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchServers') || 'Search servers...'}
              className="w-full pl-9 pr-8 py-2 bg-navy-800/60 border border-navy-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {/* Multi-Select Controls - only show when selecting */}
        {onShareOnLAN && isMultiSelectMode && (
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                <span className="text-xs text-gray-400">
                  {selectedServerIds.length} selected
                </span>
                <button
                  onClick={selectAll}
                  className="text-xs px-2 py-1 text-teal-400 hover:text-teal-300 transition-colors"
                >
                  Select All
                </button>
                
                {/* Select by Tag dropdown */}
                {allTags.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowTagSelector(!showTagSelector)}
                      className="text-xs px-2 py-1 text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      By Tag
                    </button>
                    
                    {showTagSelector && (
                      <div 
                        className="absolute top-full left-0 mt-1 bg-navy-800 border border-navy-700 rounded-lg shadow-xl z-50 min-w-[180px] max-h-[200px] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {allTags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => selectByTag(tag)}
                            className="w-full px-3 py-2 text-left text-xs text-white hover:bg-navy-700 transition-colors flex items-center justify-between gap-2"
                          >
                            <span className="truncate">{tag}</span>
                            <span className="text-gray-500 text-[10px] bg-navy-900 px-1.5 py-0.5 rounded">
                              {tagStats[tag]}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <button
                  onClick={clearSelection}
                  className="text-xs px-2 py-1 text-gray-400 hover:text-white transition-colors"
                >
                  Clear
                </button>
                {selectedServerIds.length > 0 && (
                  <button
                    onClick={() => {
                      onShareOnLAN(selectedServerIds);
                      setIsMultiSelectMode(false);
                    }}
                    className="ml-auto text-xs px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share ({selectedServerIds.length})
                  </button>
                )}
              </div>
          </div>
        )}
        
        {searchTerm && (
          <p className="text-xs text-gray-500">{filteredServers.length} result{filteredServers.length !== 1 ? 's' : ''}</p>
        )}
      </div>

      {/* Server Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filteredServers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32">
            <p className="text-sm text-gray-400">{t('noMatchingServers') || 'No servers found'}</p>
            <button onClick={() => setSearchTerm('')} className="text-xs text-teal-400 hover:text-teal-300 mt-2">
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {filteredServers.map(server => {
              const protocol = PROTOCOL_CONFIG[server.protocol || 'ssh'];
              const isHovered = hoveredId === server.id;
              const isSelected = selectedServerIds.includes(server.id);
              const connectionStr = server.protocol === 'wss' 
                ? (server.wssUrl || server.host)
                : `${server.username}@${server.host}:${server.port}`;

              return (
                <div
                  key={server.id}
                  className={`group relative bg-navy-800 rounded-lg border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-teal-500 shadow-lg shadow-teal-500/20 ring-2 ring-teal-500/30'
                      : isHovered 
                      ? 'border-teal-500/50 shadow-lg shadow-teal-500/10' 
                      : 'border-navy-700 hover:border-navy-600'
                  }`}
                  onMouseEnter={() => setHoveredId(server.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={(e) => {
                    if (isMultiSelectMode) {
                      e.stopPropagation();
                      toggleSelection(server.id);
                    } else {
                      onConnect(server);
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, server)}
                >
                  {/* Multi-select checkbox */}
                  {isMultiSelectMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-teal-500 border-teal-500'
                            : 'bg-navy-900 border-navy-600 hover:border-teal-500'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(server.id);
                        }}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Protocol indicator */}
                  <div 
                    className="absolute top-0 left-4 w-8 h-1 rounded-b-full"
                    style={{ backgroundColor: protocol.color }}
                  />

                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {/* Protocol icon */}
                        <div 
                          className={`w-9 h-9 rounded-lg ${protocol.bgColor} flex items-center justify-center`}
                          style={{ color: protocol.color }}
                        >
                          {protocol.icon}
                        </div>
                        <span 
                          className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${protocol.color}20`, color: protocol.color }}
                        >
                          {protocol.label}
                        </span>
                      </div>
                      
                      {/* Actions */}
                      <div className={`flex gap-1 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(server); }}
                          className="p-1.5 rounded hover:bg-navy-700 text-gray-400 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(server.id); }}
                          className="p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Server name */}
                    <h3 className="font-semibold text-white text-sm truncate mb-1">{server.name}</h3>
                    
                    {/* Host */}
                    <p className="text-xs text-gray-500 font-mono truncate">
                      {server.protocol === 'wss' ? (server.wssUrl || server.host) : server.host}
                    </p>

                    {/* Tags */}
                    {server.tags && server.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {server.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-navy-700 text-gray-400">
                            {tag}
                          </span>
                        ))}
                        {server.tags.length > 2 && (
                          <span className="text-[10px] text-gray-500">+{server.tags.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-[9999] bg-navy-800 border border-navy-700 rounded-lg shadow-2xl py-1 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onConnect(contextMenu.server);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-navy-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {t('connect')}
          </button>
          {/* SFTP Direct Connect - only for SSH servers */}
          {onConnectSFTP && (!contextMenu.server.protocol || contextMenu.server.protocol === 'ssh') && (
            <button
              onClick={() => {
                onConnectSFTP(contextMenu.server);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm text-teal-400 hover:bg-navy-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {t('sftp')}
            </button>
          )}
          <button
            onClick={() => {
              onEdit(contextMenu.server);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-navy-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            {t('edit')}
          </button>
          {onShareOnLAN && (
            <>
              <button
                onClick={() => {
                  onShareOnLAN([contextMenu.server.id]);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-navy-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {t('shareOnLAN')}
              </button>
              
              {/* Share by tag submenu */}
              {contextMenu.server.tags && contextMenu.server.tags.length > 0 && (
                <div className="relative group/submenu">
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-purple-400 hover:bg-navy-700 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span>Share by Tag</span>
                    </div>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  
                  {/* Submenu */}
                  <div className="absolute left-full top-0 ml-1 bg-navy-800 border border-navy-700 rounded-lg shadow-2xl py-1 min-w-[160px] opacity-0 invisible group-hover/submenu:opacity-100 group-hover/submenu:visible transition-all">
                    {contextMenu.server.tags.map(tag => {
                      const count = tagStats[tag] || 0;
                      return (
                        <button
                          key={tag}
                          onClick={() => {
                            selectByTag(tag);
                            setContextMenu(null);
                            setIsMultiSelectMode(true);
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-white hover:bg-navy-700 flex items-center justify-between gap-2"
                        >
                          <span className="truncate">{tag}</span>
                          <span className="text-gray-500 text-[10px] bg-navy-900 px-1.5 py-0.5 rounded">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
          <div className="border-t border-navy-700 my-1" />
          <button
            onClick={() => {
              onDelete(contextMenu.server.id);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t('delete')}
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(ServerList);
