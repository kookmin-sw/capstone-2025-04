// BOJ - 11659 구간 합 구하기 4

// sum[i] = sum(arr[1::i])
// 구간합(i, j) = sum[j] - sum[i - 1]

#include <iostream>

using namespace std;

int main()
{
    cin.tie(0);
    ios::sync_with_stdio(false);
    int n, m; cin >> n >> m;
    int sum[n + 1] = {0, };
    for(int i = 1; i <= n; i++)
    {
        int t; cin >> t;
        sum[i] = sum[i - 1] + t;
    }

    for(int i = 0; i < m; i++)
    {
        int a, b; cin >> a >> b;
        cout << (sum[b] - sum[a - 1]) << '\n';
    }

    return 0;
}