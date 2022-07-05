import crypto from 'crypto'
import { useState } from 'react'
import {
	Button,
	Dialog,
	Skeleton,
	Spinner,
	Typography,
} from '@ensdomains/thorin'
import { useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi'
import { ensRegistrarConfig, ensResolver } from '../lib/constants'

export default function Registration({
	commitCost,
	duration,
	name,
	open,
	owner,
	registrationCost,
	setIsOpen,
}) {
	const [secret, setSecret] = useState(
		'0x' + crypto.randomBytes(32).toString('hex')
	)
	const durationInSeconds = duration * 365 * 24 * 60 * 60

	// Contract read: make commitment
	const commitment = useContractRead({
		...ensRegistrarConfig,
		functionName: open && 'makeCommitmentWithConfig',
		args: [
			name, // name
			owner, // owner
			secret, // secret
			ensResolver, // resolver
			owner, // addr
		],
	})

	// Contract write: commit
	const commit = useContractWrite({
		...ensRegistrarConfig,
		functionName: 'commit',
		args: commitment?.data,
	})

	// Wait for commit to settle
	const waitForCommit = useWaitForTransaction({
		hash: commit?.data?.hash,
	})

	// Contract read: price
	const price = useContractRead({
		...ensRegistrarConfig,
		functionName: open && 'rentPrice',
		args: [name, durationInSeconds],
		watch: true,
	})

	// Contract write: register
	const register = useContractWrite({
		...ensRegistrarConfig,
		functionName: 'registerWithConfig',
		args: [
			name, // name
			owner, // owner
			durationInSeconds, // duration
			secret, // secret
			ensResolver, // resolver
			owner, // addr
		],
		overrides: {
			value: price.data,
			gasLimit: '280000',
		},
	})

	// Wait for register to settle
	const waitForRegister = useWaitForTransaction({
		hash: register?.data?.hash,
	})

	return (
		<>
			<Dialog
				open={open}
				className="modal"
				title={`Register ${name}.eth`}
				variant="actionable"
				leading={
					<Button
						shadowless
						variant="secondary"
						onClick={() => setIsOpen(false)}
					>
						Cancel
					</Button>
				}
				trailing={<Button shadowless>Begin</Button>}
				onDismiss={() => setIsOpen(false)}
			>
				<div>
					<Typography
						as="p"
						size="base"
						style={{ marginBottom: '1rem' }}
					>
						Registering an ENS name is a two step process. In
						between the steps, there is a 1 minute waiting period.
						This is to protect you from a bad actor front-running
						your registration.
					</Typography>
					<Typography size="base" weight="medium">
						<ul className="steps">
							<li className="step">
								<Skeleton
									loading={false}
									style={{
										borderRadius: '100%',
										backgroundColor: 'rgba(0,0,0,0.15)',
									}}
								>
									<Spinner color="accent" />
								</Skeleton>
								Commit - ${commitCost.toFixed(2)}
							</li>
							<li className="step">
								<Skeleton
									loading={true}
									style={{
										borderRadius: '100%',
										backgroundColor: 'rgba(0,0,0,0.15)',
									}}
								>
									<Spinner color="accent" />
								</Skeleton>
								Register - ${registrationCost.toFixed(2)}
							</li>
						</ul>
					</Typography>
				</div>
			</Dialog>

			<style jsx>{`
				.steps {
					display: flex;
					flex-direction: column;
					gap: 0.5rem;
				}

				.step {
					display: flex;
					gap: 0.5rem;
				}
			`}</style>
		</>
	)
}
