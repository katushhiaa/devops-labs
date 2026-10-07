# Розгортання застосунку в Kubernetes (Minikube)

У цьому розділі наведено інструкцію з розгортання бекенд-застосунку «Certificate Generator» та бази даних MongoDB у локальному кластері Kubernetes (Minikube) з використанням маніфестів із каталогу `k8s/`.

---

## 1. Порядок розгортання

1. **Запуск локального кластера Minikube:**
   ```bash
   minikube start
   ```

2. **Збірка контейнерного образу у середовищі Minikube:**
   Щоб Kubernetes мав доступ до локального образу без зовнішнього реєстру (Container Registry), збірка виконується безпосередньо всередині демона Minikube:
   ```bash
   minikube image build -t cert-generator:1.1.0 -f Dockerfile.backend .
   ```

3. **Застосування маніфестів Kubernetes:**
   Усі компоненти системи (Namespace, ConfigMap, Secret, PersistentVolumeClaim, Deployments, Services, Ingress) розгортаються єдиною командою:
   ```bash
   kubectl apply -f k8s/
   ```

4. **Перевірка стану ресурсів:**
   Переконайтеся, що всі поди перейшли у стан `Running` і готові приймати трафік (`1/1`):
   ```bash
   kubectl get pods -n anurieva
   ```

5. **Прокидання порту для доступу до сервісу:**
   Для взаємодії з додатком через локальний браузер або curl виконайте port-forward:
   ```bash
   kubectl port-forward svc/cert-generator-service 8080:80 -n anurieva
   ```

6. **Перевірка працездатності:**
   Відкрийте в браузері або виконайте HTTP-запит до ендпоінта перевірки стану:
   ```text
   http://localhost:8080/health
   ```
   Очікувана відповідь:
   ```json
   {
     "status": "ok",
     "app": "Certificate Generator API",
     "version": "1.1.0",
     "environment": "production"
   }
   ```

---

## 2. Перелік параметрів у ConfigMap та Secret

Конфігурація середовища передається в контейнери додатку декларативно через ресурси `ConfigMap` та `Secret` у просторі імен `anurieva`.

### 2.1. ConfigMap (`k8s/01-configmap.yaml` — `app-config`)
Містить відкриті неконфіденційні змінні оточення, необхідні для роботи сервісу:

| Ключ | Значення | Опис |
| :--- | :--- | :--- |
| `PORT` | `3001` | Внутрішній мережевий порт, який прослуховує Express-сервер усередині контейнера. |
| `NODE_ENV` | `production` | Режим роботи Node.js середовища (вимикає дебаг-виводи, оптимізує продуктивність). |
| `MONGO_URI` | `mongodb://mongodb-service:27017/certific_generation` | Рядок підключення до MongoDB через внутрішню DNS-адресу кластера (`mongodb-service` у порт `27017`). |

### 2.2. Secret (`k8s/02-secret.yaml` — `app-secret`)
Містить чутливі дані, закодовані за стандартом Base64:

| Ключ | Значення (Base64) | Розшифроване значення | Опис |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | `c3VwZXJfc2VjcmV0X2tleV9mb3Jfand0XzEyMzQ1` | `super_secret_key_for_jwt_12345` | Секретний ключ для підпису, шифрування та валідації користувацьких JWT-токенів автентифікації. |

> **Примітка щодо безпеки:** Дані з `app-config` та `app-secret` монтуються в контейнер застосунку через секцію `envFrom` у `04-deployment.yaml`, що виключає необхідність зберігати чутливі дані в коді або образі контейнера.