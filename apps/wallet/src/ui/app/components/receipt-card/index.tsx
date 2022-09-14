// Copyright (c) 2022, Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import cl from 'classnames';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

import {
    coinFormat,
    useCoinFormat,
} from '_app/shared/coin-balance/coin-format';
import ExplorerLink from '_components/explorer-link';
import { ExplorerLinkType } from '_components/explorer-link/ExplorerLinkType';
import Icon, { SuiIcons } from '_components/icon';
import { formatDate } from '_helpers';
import { useFileExtentionType } from '_hooks';
import { GAS_TYPE_ARG } from '_redux/slices/sui-objects/Coin';

import type { TxResultState } from '_redux/slices/txresults';

import st from './ReceiptCard.module.scss';

type TxResponseProps = {
    txDigest: TxResultState;
    tranferType?: 'nft' | 'coin' | null;
};

function ReceiptCard({ tranferType, txDigest }: TxResponseProps) {
    const TxIcon = txDigest.isSender ? SuiIcons.ArrowLeft : SuiIcons.Buy;
    const iconClassName = txDigest.isSender
        ? cl(st.arrowActionIcon, st.angledArrow)
        : cl(st.arrowActionIcon, st.buyIcon);

    const intl = useIntl();

    const imgUrl = txDigest?.url
        ? txDigest?.url.replace(/^ipfs:\/\//, 'https://ipfs.io/ipfs/')
        : false;

    const date = txDigest?.timestampMs
        ? formatDate(txDigest.timestampMs, ['month', 'day', 'year'])
        : false;

    const transfersTxt = {
        nft: {
            header: 'Successfully Sent!',
        },
        coin: {
            header: 'SUI Transfer Completed!',
            copy: 'Staking SUI provides SUI holders with rewards to market price gains.',
        },
    };
    // TODO add copy for other trafer type like transfer sui, swap, etc.
    const headerCopy = tranferType
        ? transfersTxt[tranferType].header
        : `${txDigest.isSender ? 'Sent' : 'Received'} ${date || ''}`;
    const SuccessCard = (
        <>
            <div className={st.successIcon}>
                <Icon icon={TxIcon} className={iconClassName} />
            </div>
            <div className={st.successText}>{headerCopy}</div>
        </>
    );

    const failedCard = (
        <>
            <div className={st.failedIcon}>
                <div className={st.iconBg}>
                    <Icon icon={SuiIcons.Close} className={cl(st.close)} />
                </div>
            </div>
            <div className={st.failedText}>Failed</div>
            <div className={st.errorMessage}>{txDigest?.error}</div>
        </>
    );

    const fileExtentionType = useFileExtentionType(txDigest.url || '');

    const AssetCard = imgUrl && (
        <div className={st.wideview}>
            <div className={st.nftfields}>
                <div className={st.nftName}>{txDigest?.name}</div>
                <div className={st.nftType}>
                    {fileExtentionType?.name} {fileExtentionType?.type}
                </div>
            </div>
            <img
                className={cl(st.img)}
                src={imgUrl}
                alt={txDigest?.name || 'NFT'}
            />
        </div>
    );

    const statusClassName =
        txDigest.status === 'success' ? st.success : st.failed;

    const { amount: txAmount, txGas } = txDigest;
    const txDigestAmountFormatData = useMemo(
        // XXX: it seems that we only support SUI, what happens if we send another coin?
        () =>
            txAmount
                ? coinFormat(intl, BigInt(txAmount), GAS_TYPE_ARG, 'accurate')
                : null,
        [txAmount, intl]
    );
    const gasFormatted = useCoinFormat(
        BigInt(txGas),
        GAS_TYPE_ARG,
        'accurate'
    ).displayFull;
    // XXX: same as above this only works when the transferred coin was SUI
    const totalFormatted = useMemo(
        () =>
            txAmount
                ? coinFormat(
                      intl,
                      BigInt(txAmount) + BigInt(txGas),
                      GAS_TYPE_ARG,
                      'accurate'
                  ).displayFull
                : null,
        [txAmount, txGas, intl]
    );
    return (
        <>
            <div className={st.txnResponse}>
                {txDigest.status === 'success' ? SuccessCard : failedCard}
                <div className={st.responseCard}>
                    {AssetCard}
                    {txDigestAmountFormatData && (
                        <div className={st.amount}>
                            {txDigestAmountFormatData.displayBalance}{' '}
                            <span>{txDigestAmountFormatData.symbol}</span>
                        </div>
                    )}
                    <div
                        className={cl(
                            st.txInfo,
                            !txDigest.isSender && st.reciever
                        )}
                    >
                        <div className={cl(st.txInfoLabel, statusClassName)}>
                            Your Wallet
                        </div>
                        <div className={cl(st.txInfoValue, statusClassName)}>
                            {txDigest.kind !== 'Call' && txDigest.isSender
                                ? txDigest.to
                                : txDigest.from}
                        </div>
                    </div>

                    {txDigest.txGas && (
                        <div className={st.txFees}>
                            <div className={st.txInfoLabel}>Gas Fee</div>
                            <div className={st.walletInfoValue}>
                                {gasFormatted}
                            </div>
                        </div>
                    )}

                    {totalFormatted && (
                        <div className={st.txFees}>
                            <div className={st.txInfoLabel}>Total Amount</div>
                            <div className={st.walletInfoValue}>
                                {totalFormatted}
                            </div>
                        </div>
                    )}

                    {date && (
                        <div className={st.txDate}>
                            <div className={st.txInfoLabel}>Date</div>
                            <div className={st.walletInfoValue}>{date}</div>
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
                                View in Explorer
                            </ExplorerLink>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default ReceiptCard;
