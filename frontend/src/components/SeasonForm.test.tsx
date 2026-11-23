import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TestProviders } from '../test/TestProviders'
import { SeasonForm } from './SeasonForm'

describe('SeasonForm', () => {
  it("n'autorise pas plus de 3 objectifs secondaires", async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <SeasonForm />
      </TestProviders>,
    )

    const add = screen.getByRole('button', { name: 'Ajouter un objectif secondaire' })
    await user.click(add)
    await user.click(add)
    await user.click(add)

    expect(add).toBeDisabled()
  })
})
