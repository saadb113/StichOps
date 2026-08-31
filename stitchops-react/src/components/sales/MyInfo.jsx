import { useState } from 'react';
import { useAppState } from '../../store/AppStateContext';
import { fmt } from '../../lib/helpers';
import { PersonIcon, MailIcon } from '../icons/Icon';
import ImageUploadBox from '../common/ImageUploadBox';

function YourDetails(){
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
<path d="M8.625 10.5087C7.09003 10.4373 5.53751 10.8048 4.18318 11.6112C3.1221 12.243 0.340023 13.5331 2.0345 15.1474C2.86223 15.936 3.78412 16.5 4.94315 16.5H9" stroke="#191919" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11.625 4.875C11.625 6.73896 10.114 8.25 8.25 8.25C6.38604 8.25 4.875 6.73896 4.875 4.875C4.875 3.01104 6.38604 1.5 8.25 1.5C10.114 1.5 11.625 3.01104 11.625 4.875Z" stroke="#191919" stroke-width="1.2"/>
<path d="M13.5 15.5357V16.5M13.5 15.5357C12.6324 15.5357 11.868 15.1096 11.4197 14.4625M15.5804 11.7877C15.8454 12.1703 16 12.6303 16 13.125C16 13.6198 15.8454 14.0798 15.5803 14.4625C15.132 15.1096 14.3676 15.5357 13.5 15.5357M13.5 10.7143C14.3677 10.7143 15.1321 11.1405 15.5804 11.7877M13.5 10.7143C12.6323 10.7143 11.8679 11.1405 11.4196 11.7877M13.5 10.7143V9.75M16.5 11.1964L15.5804 11.7877M10.5003 15.0536L11.4197 14.4625M10.5 11.1964L11.4196 11.7877M16.4997 15.0536L15.5803 14.4625M11.4196 11.7877C11.1546 12.1703 11 12.6303 11 13.125C11 13.6198 11.1546 14.0798 11.4197 14.4625" stroke="#191919" stroke-width="1.2" stroke-linecap="round"/>
</svg>
}
function Email(){
  return <svg class xmlns="http://www.w3.org/2000/svg" width="17" height="14" viewBox="0 0 17 14" fill="none">
<path fill-rule="evenodd" clip-rule="evenodd" d="M10.0742 0.027604C8.60739 -0.00920511 7.5176 -0.0091987 6.05078 0.0276074L5.99464 0.029015C4.86262 0.0573898 3.93121 0.0807362 3.18048 0.211315C2.38371 0.349903 1.71657 0.619807 1.15152 1.1863C0.589425 1.74983 0.320289 2.40645 0.183943 3.19062C0.0559858 3.92654 0.0366226 4.83468 0.0131869 5.93381L0.0119807 5.99036C-0.00399958 6.73879 -0.0039907 7.13621 0.0119902 7.88465L0.0131964 7.94119C0.0366331 9.04033 0.0559972 9.94847 0.183955 10.6844C0.320301 11.4686 0.589437 12.1252 1.15153 12.6887C1.71658 13.2552 2.38372 13.5251 3.18049 13.6637C3.93122 13.7943 4.86262 13.8176 5.99464 13.846L6.05079 13.8474C7.51762 13.8842 8.6074 13.8842 10.0742 13.8474L10.1303 13.846C11.2624 13.8176 12.1938 13.7943 12.9445 13.6637C13.7413 13.5251 14.4084 13.2552 14.9735 12.6887C15.5356 12.1252 15.8047 11.4685 15.9411 10.6844C16.069 9.94846 16.0884 9.04033 16.1118 7.94121L16.113 7.88464C16.129 7.13621 16.129 6.73879 16.113 5.99036L16.1118 5.93383C16.0884 4.8347 16.069 3.92653 15.941 3.19062C15.8047 2.40645 15.5356 1.74983 14.9735 1.18631C14.6559 0.867958 14.3062 0.643273 13.9193 0.482921C13.8604 0.450777 13.7973 0.42655 13.7316 0.411083C13.4842 0.323877 13.2222 0.259621 12.9445 0.211317C12.1938 0.0807373 11.2624 0.0573889 10.1304 0.0290117L10.0742 0.027604ZM14.5723 4.57523C14.5578 4.27109 14.5506 4.11903 14.4404 4.05832C14.3303 3.99761 14.1949 4.07431 13.9242 4.22773L10.7473 6.02775C9.77261 6.58003 8.94826 6.93749 8.06235 6.93749C7.17645 6.93749 6.3521 6.58003 5.37739 6.02775L2.20084 4.22789C1.93007 4.07447 1.79469 3.99776 1.68456 4.05848C1.57443 4.11919 1.56718 4.27126 1.55267 4.5754C1.53312 4.98528 1.52252 5.46046 1.51053 6.02227C1.495 6.74943 1.49501 7.12557 1.51053 7.85273C1.53552 9.02273 1.55446 9.817 1.66074 10.4283C1.76082 11.0038 1.92779 11.3458 2.21341 11.6322C2.49607 11.9155 2.8427 12.0854 3.43766 12.1889C4.0663 12.2982 4.88623 12.3207 6.08844 12.3509C7.53017 12.387 8.59484 12.387 10.0366 12.3508C11.2388 12.3207 12.0587 12.2982 12.6874 12.1889C13.2823 12.0854 13.6289 11.9155 13.9116 11.6322C14.1972 11.3458 14.3642 11.0038 14.4643 10.4282C14.5706 9.81699 14.5895 9.02272 14.6145 7.85272C14.63 7.12557 14.63 6.74943 14.6145 6.02228C14.6025 5.46038 14.5919 4.98515 14.5723 4.57523Z" fill="#191919"/>
</svg>
}
const TABS = [
  { key: 'details', label: 'Your Details', icon: <YourDetails /> },
  { key: 'emails', label: 'Assigned Emails', icon: <Email /> }
];

export default function MyInfo() {
  const { currentEmployee: emp, uploadEmployeePhoto, deleteEmployeePhoto } = useAppState();
  const [tab, setTab] = useState('details');

  return (
    <div className="elg-page">
      <div className="elg-page-head">
        <div>
          <div className="elg-page-title">My Info</div>
          <div className="elg-page-sub">Managed by your admin — contact them to correct anything</div>
        </div>
      </div>

      <div className="elg-settings-grid myinfo">
        <div className="elg-settings-nav">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.key}
                className={`elg-settings-nav-item ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {Icon}
                {t.label}
              </div>
            );
          })}
        </div>

        <div className="elg-settings-main ">
          {tab === 'details' ? (
            <div className="elg-settings-card upload-image-card">
              <div className="elg-settings-card-title "><h2>Your Photo</h2></div>
              <ImageUploadBox imageUrl={emp.photo} onUpload={(file) => uploadEmployeePhoto(emp.id, file)} onDelete={emp.photo ? () => deleteEmployeePhoto(emp.id) : null} />
            </div>
          ) : null}
          {tab === 'details' ? (
            <div className="elg-settings-card">
              <div className="elg-settings-card-title "><h2>Your Details</h2></div>
              <div className="elg-kv">
                <div className="elg-kv-row"><span className="k">Name</span><span className="v">{emp.name}</span></div>
                <div className="elg-kv-row"><span className="k">Designation</span><span className="v">{emp.designation || emp.role}</span></div>
                <div className="elg-kv-row"><span className="k">Email</span><span className="v">{emp.email || '—'}</span></div>
                <div className="elg-kv-row"><span className="k">Paid in</span><span className="v">{emp.currency}</span></div>
                <div className="elg-kv-row"><span className="k">Base salary</span><span className="v">{fmt(emp.baseSalary, emp.currency)}</span></div>
                <div className="elg-kv-row"><span className="k">Payout day</span><span className="v">{emp.payoutDay} of each month</span></div>
              </div>
            </div>
          ) : (
            <div className="elg-settings-card">
              <div className="elg-settings-card-title"><h2>Assigned Emails</h2></div>
              {(!emp.emails || emp.emails.length === 0) ? (
                <div style={{ fontSize: 13, color: 'var(--elg-ink-3)' }}>No emails assigned yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {emp.emails.map((em) => (
                    <div key={em} className="elg-input" style={{ display: 'flex', alignItems: 'center', padding : "10px 14px" }}>{em}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
