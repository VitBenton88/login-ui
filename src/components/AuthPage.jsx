import Form from './Form'
import { FormProvider } from '../contexts/FormContext'

export default function AuthPage() {
  return (
    <FormProvider>
      <Form />
    </FormProvider>
  )
}
