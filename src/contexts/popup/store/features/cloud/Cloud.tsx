import { useAppSelector, useAppDispatch } from "@/contexts/popup/hooks";
import {
  fetchCloudStatusAsync,
  cloudSignInAsync,
  cloudSignUpAsync,
  cloudSignOutAsync,
  selectCloudConfigured,
  selectCloudLoading,
  selectCloudUser,
} from "./cloudSlice";

import style from "./Cloud.module.scss";

export const Cloud = ({}: Cloud.Props) => {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectCloudLoading);
  const configured = useAppSelector(selectCloudConfigured);
  const user = useAppSelector(selectCloudUser);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    dispatch(fetchCloudStatusAsync());
  }, []);

  const onSignIn = async () => {
    setSubmitting(true);
    await dispatch(cloudSignInAsync({ email, password }));
    setSubmitting(false);
  };

  const onSignUp = async () => {
    setSubmitting(true);
    await dispatch(cloudSignUpAsync({ email, password }));
    setSubmitting(false);
  };

  const onSignOut = () => {
    dispatch(cloudSignOutAsync());
  };

  if (!configured && !loading) {
    return (
      <div className={style.cloud}>
        <p className={style.hint}>
          El guardado en la nube no está configurado en este build.
        </p>
      </div>
    );
  }

  return (
    <Loading loading={loading} overlay spinnerSize="2rem">
      <div className={style.cloud}>
        {user ? (
          <div className={style.status}>
            <FontIcon icon="user" className={style.icon} />
            <span className={style.email}>{user.email}</span>
            <Button type="cancel" onClick={onSignOut}>
              <FontIcon icon="power" />
            </Button>
          </div>
        ) : (
          <div className={style.form}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <div className={style.actions}>
              <Button
                onClick={onSignIn}
                disabled={submitting || !email || !password}
              >
                Iniciar sesión
              </Button>
              <Button
                onClick={onSignUp}
                disabled={submitting || !email || !password}
              >
                Crear cuenta
              </Button>
            </div>
            <p className={style.hint}>
              Tus ubicaciones marcadas, categorías y notas se sincronizan a tu
              cuenta y se pueden recuperar en cualquier dispositivo.
            </p>
          </div>
        )}
      </div>
    </Loading>
  );
};

namespace Cloud {
  export interface Props {}
}
