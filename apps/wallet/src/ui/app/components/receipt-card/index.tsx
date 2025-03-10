// Copyright (c) 2022, Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import cl from 'classnames';
import { useIntl } from 'react-intl';

import ExplorerLink from '_components/explorer-link';
import { ExplorerLinkType } from '_components/explorer-link/ExplorerLinkType';
import { formatDate } from '_helpers';
import { useMiddleEllipsis } from '_hooks';
import { GAS_SYMBOL } from '_redux/slices/sui-objects/Coin';
import { balanceFormatOptions } from '_shared/formatting';

import type { TxResultState } from '_redux/slices/txresults';

import st from './ReceiptCard.module.scss';

type TxResponseProps = {
    txDigest: TxResultState;
    transferType?: 'nft' | 'coin' | null;
};

const TRUNCATE_MAX_LENGTH = 8;
const TRUNCATE_PREFIX_LENGTH = 4;

// Truncate text after one line (~ 35 characters)
const TRUNCATE_MAX_CHAR = 40;

function ReceiptCard({ txDigest }: TxResponseProps) {
    const toAddrStr = useMiddleEllipsis(
        txDigest.to || '',
        TRUNCATE_MAX_LENGTH,
        TRUNCATE_PREFIX_LENGTH
    );

    const fromAddrStr = useMiddleEllipsis(
        txDigest.from || '',
        TRUNCATE_MAX_LENGTH,
        TRUNCATE_PREFIX_LENGTH
    );

    const truncatedNftName = useMiddleEllipsis(
        txDigest?.name || '',
        TRUNCATE_MAX_CHAR,
        TRUNCATE_MAX_CHAR - 1
    );

    const truncatedNftDescription = useMiddleEllipsis(
        txDigest?.description || '',
        TRUNCATE_MAX_CHAR,
        TRUNCATE_MAX_CHAR - 1
    );

    const callTitle =
        txDigest.name && txDigest.url
            ? 'Minted'
            : txDigest?.callFunctionName || 'Call';

    const transferType =
        txDigest.kind === 'Call'
            ? 'Call'
            : txDigest.isSender
            ? 'Sent'
            : 'Received';

    const transferMeta = {
        Call: {
            txName: callTitle,
            transfer: txDigest.isSender ? 'To' : 'From',
            address: false,
            addressTruncate: false,
            failedMsg: txDigest?.error || 'Failed',
        },
        Sent: {
            txName: 'Sent',
            transfer: 'To',
            addressTruncate: toAddrStr,
            address: txDigest.to,
            failedMsg: txDigest?.error || 'Failed',
        },
        Received: {
            txName: 'Received',
            transfer: 'From',
            addressTruncate: fromAddrStr,
            address: txDigest.from,
            failedMsg: '',
        },
    };

    const intl = useIntl();

    const imgUrl = txDigest?.url
        ? txDigest?.url.replace(/^ipfs:\/\//, 'https://ipfs.io/ipfs/')
        : false;

    const date = txDigest?.timestampMs
        ? formatDate(txDigest.timestampMs, [
              'month',
              'day',
              'year',
              'hour',
              'minute',
          ])
        : false;

    const assetCard = imgUrl && (
        <div className={st.wideview}>
            <img
                className={cl(st.img)}
                src={imgUrl}
                alt={txDigest?.name || 'NFT'}
            />
            <div className={st.nftfields}>
                <div className={st.nftName}>{truncatedNftName}</div>
                <div className={st.nftType}>{truncatedNftDescription}</div>
            </div>
        </div>
    );

    const statusClassName =
        txDigest.status === 'success' ? st.success : st.failed;

    return (
        <>
            <div className={cl(st.txnResponse, statusClassName)}>
                <div className={st.txnResponseStatus}>
                    <div className={st.statusIcon}></div>
                    <div className={st.date}>
                        {date && date.replace(' AM', 'am').replace(' PM', 'pm')}
                    </div>
                </div>

                <div className={st.responseCard}>
                    <div className={st.status}>
                        <div className={st.amountTransferred}>
                            <div className={st.label}>
                                {txDigest.status === 'success'
                                    ? transferMeta[transferType].txName
                                    : transferMeta[transferType].failedMsg}
                            </div>
                            {(txDigest.amount || txDigest.balance) && (
                                <div className={st.amount}>
                                    {intl.formatNumber(
                                        BigInt(
                                            txDigest.amount ||
                                                txDigest.balance ||
                                                0
                                        ),
                                        balanceFormatOptions
                                    )}
                                    <sup>{txDigest.coinSymbol}</sup>
                                </div>
                            )}
                        </div>

                        {assetCard}
                    </div>

                    {transferMeta[transferType].address && (
                        <div className={st.txnItem}>
                            <div className={st.label}>
                                {transferMeta[transferType].transfer}
                            </div>
                            <div className={cl(st.value, st.walletAddress)}>
                                <ExplorerLink
                                    type={ExplorerLinkType.address}
                                    address={
                                        transferMeta[transferType]
                                            .address as string
                                    }
                                    title="View on Sui Explorer"
                                    className={st['explorer-link']}
                                    showIcon={false}
                                >
                                    {transferMeta[transferType].addressTruncate}
                                </ExplorerLink>
                            </div>
                        </div>
                    )}

                    {txDigest.txGas && (
                        <div
                            className={cl(
                                st.txFees,
                                st.txnItem,
                                txDigest.isSender && st.noBorder
                            )}
                        >
                            <div className={st.label}>Gas Fees</div>
                            <div className={st.value}>
                                {txDigest.txGas} {GAS_SYMBOL}
                            </div>
                        </div>
                    )}

                    {txDigest.amount && txDigest.isSender && (
                        <div className={cl(st.txFees, st.txnItem)}>
                            <div className={st.txInfoLabel}>Total Amount</div>
                            <div className={st.walletInfoValue}>
                                {intl.formatNumber(
                                    BigInt(
                                        txDigest.amount + txDigest.txGas || 0
                                    ),
                                    balanceFormatOptions
                                )}{' '}
                                {GAS_SYMBOL}
                            </div>
                        </div>
                    )}

                    {txDigest.txId && (
                        <div className={st.explorerLink}>
                            <ExplorerLink
                                type={ExplorerLinkType.transaction}
                                transactionID={txDigest.txId}
                                title="View on Sui Explorer"
                                className={st['explorer-link']}
                                showIcon={true}
                            >
                                View on Explorer
                            </ExplorerLink>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default ReceiptCard;
