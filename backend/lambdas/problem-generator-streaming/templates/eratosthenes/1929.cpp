// BOJ - 1929 소수 구하기

#include <bits/stdc++.h>

using namespace std;
int isPrime(int k) {
    if(k == 1) return 0;
    for(int i = 2; i * i <= k; i++) if(k % i == 0) return 0;
    return 1;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);

    int m, n; cin >> m >> n;
    for(int i = m; i <= n; i++) if(isPrime(i)) cout << i << '\n';    
}