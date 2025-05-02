import { createContext, useContext, useState } from 'react'

const FormContext = createContext()

export function FormProvider({ children }) {
  const [showLogin, setShowLogin] = useState(true)

  return (
    <FormContext.Provider value={{ showLogin, setShowLogin }}>
      {children}
    </FormContext.Provider>
  )
}

export function useFormContext() {
  return useContext(FormContext)
}
