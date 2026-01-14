import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  onClose: () => void;
}

const PortKnockingGuideModal: React.FC<Props> = ({ onClose }) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            🔒 {t('knockGuideTitle')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Security Benefits */}
          <section>
            <h3 className="text-xl font-semibold text-blue-400 mb-3 flex items-center gap-2">
              🔒 {t('knockSecurityBenefits')}
            </h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span><strong>{t('knockStealth')}:</strong> {t('knockStealthDesc')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span><strong>{t('knockBrutePrevention')}:</strong> {t('knockBrutePreventionDesc')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span><strong>{t('knockPreAuth')}:</strong> {t('knockPreAuthDesc')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span><strong>{t('knockZeroDay')}:</strong> {t('knockZeroDayDesc')}</span>
              </li>
            </ul>
          </section>

          {/* Prerequisites */}
          <section>
            <h3 className="text-xl font-semibold text-purple-400 mb-3">
              📋 {t('knockPrerequisites')}
            </h3>
            <ul className="space-y-1 text-gray-300 list-disc list-inside">
              <li>{t('knockPrereq1')}</li>
              <li>{t('knockPrereq2')}</li>
              <li>{t('knockPrereq3')}</li>
            </ul>
          </section>

          {/* Server Setup Steps */}
          <section>
            <h3 className="text-xl font-semibold text-green-400 mb-3">
              🖥️ {t('knockServerSetupTitle')}
            </h3>
            
            {/* Step 1 */}
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-white mb-2">
                {t('knockStep1')}: {t('knockInstallKnockd')}
              </h4>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                <p className="text-gray-400 text-sm mb-2">{t('knockUbuntuDebian')}:</p>
                <code className="text-green-400 text-sm block mb-3">
                  sudo apt update<br/>
                  sudo apt install knockd -y
                </code>
                <p className="text-gray-400 text-sm mb-2">{t('knockCentosRHEL')}:</p>
                <code className="text-green-400 text-sm block">
                  sudo yum install epel-release -y<br/>
                  sudo yum install knock-server -y
                </code>
              </div>
            </div>

            {/* Step 2 */}
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-white mb-2">
                {t('knockStep2')}: {t('knockConfigureKnockd')}
              </h4>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                <p className="text-gray-400 text-sm mb-2">{t('knockEditConfig')}:</p>
                <code className="text-green-400 text-sm block mb-3">
                  sudo nano /etc/knockd.conf
                </code>
                <p className="text-gray-400 text-sm mb-2">{t('knockBasicConfig')}:</p>
                <pre className="text-green-400 text-xs overflow-x-auto">
{`[options]
    UseSyslog

[openSSH]
    sequence    = 7000,8000,9000,10000
    seq_timeout = 10
    command     = /sbin/iptables -A INPUT -s %IP% -p tcp --dport 22 -j ACCEPT
    tcpflags    = syn`}
                </pre>
              </div>
            </div>

            {/* Step 3 */}
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-white mb-2">
                {t('knockStep3')}: {t('knockConfigureFirewall')}
              </h4>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                <p className="text-gray-400 text-sm mb-2">{t('knockIptables')}:</p>
                <pre className="text-green-400 text-xs overflow-x-auto">
{`# ${t('knockAllowLoopback')}
sudo iptables -A INPUT -i lo -j ACCEPT

# ${t('knockAllowEstablished')}
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# ${t('knockAllowCurrentSSH')}
sudo iptables -A INPUT -s YOUR_IP -p tcp --dport 22 -j ACCEPT

# ${t('knockDropOtherSSH')}
sudo iptables -A INPUT -p tcp --dport 22 -j DROP

# ${t('knockSaveRules')}
sudo apt install iptables-persistent -y
sudo netfilter-persistent save`}
                </pre>
              </div>
            </div>

            {/* Step 4 */}
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-white mb-2">
                {t('knockStep4')}: {t('knockEnableStart')}
              </h4>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                <code className="text-green-400 text-sm block">
                  sudo systemctl enable knockd<br/>
                  sudo systemctl start knockd<br/>
                  sudo systemctl status knockd
                </code>
              </div>
            </div>

            {/* Step 5 */}
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-white mb-2">
                {t('knockStep5')}: {t('knockTestConfig')}
              </h4>
              <p className="text-gray-300 text-sm">
                {t('knockTestDesc')}
              </p>
            </div>
          </section>

          {/* Security Best Practices */}
          <section>
            <h3 className="text-xl font-semibold text-yellow-400 mb-3">
              🛡️ {t('knockBestPractices')}
            </h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">1.</span>
                <span><strong>{t('knockRandomPorts')}:</strong> {t('knockRandomPortsDesc')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">2.</span>
                <span><strong>{t('knockLongSequences')}:</strong> {t('knockLongSequencesDesc')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">3.</span>
                <span><strong>{t('knockSetTimeout')}:</strong> {t('knockSetTimeoutDesc')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400">4.</span>
                <span><strong>{t('knockUseSSHKeys')}:</strong> {t('knockUseSSHKeysDesc')}</span>
              </li>
            </ul>
          </section>

          {/* Warnings */}
          <section className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h3 className="text-xl font-semibold text-red-400 mb-3">
              ⚠️ {t('knockWarnings')}
            </h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-red-400">⚠</span>
                <span>{t('knockWarning1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">⚠</span>
                <span>{t('knockWarning2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">⚠</span>
                <span>{t('knockWarning3')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">⚠</span>
                <span>{t('knockWarning4')}</span>
              </li>
            </ul>
          </section>

          {/* Marix Integration */}
          <section className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-xl font-semibold text-blue-400 mb-3">
              💡 {t('knockMarixIntegration')}
            </h3>
            <ol className="space-y-2 text-gray-300 text-sm list-decimal list-inside">
              <li>{t('knockMarixStep1')}</li>
              <li>{t('knockMarixStep2')}</li>
              <li>{t('knockMarixStep3')}</li>
              <li>{t('knockMarixStep4')}</li>
              <li>{t('knockMarixStep5')}</li>
            </ol>
            <p className="text-green-400 text-sm mt-3">
              ✓ {t('knockMarixAutomatic')}
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 bg-gray-800/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PortKnockingGuideModal;
